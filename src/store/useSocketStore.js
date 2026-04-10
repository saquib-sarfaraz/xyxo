import { create } from 'zustand'
import { createSocket } from '../socket/socket'
import { TOKEN_KEY } from '../api/axios'
import { useAppStore } from './useAppStore'
import { useGameStore } from './useGameStore'
import { normalizeGamePayload } from '../utils/normalizeGamePayload'

const SOCKET_DEBUG =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  String(import.meta.env.VITE_SOCKET_DEBUG || '') === '1'

function normalizeToken(token) {
  if (!token) return null
  const raw = String(token).trim()
  if (!raw) return null
  return raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw
}

function readTokenFromStorage() {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token')
  } catch {
    return null
  }
}

function decodeJwtPayload(rawToken) {
  if (!rawToken) return null
  const parts = String(rawToken).split('.')
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const base64 = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')
    if (typeof atob !== 'function') return null
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isTokenExpired(rawToken) {
  const payload = decodeJwtPayload(rawToken)
  const exp = payload?.exp
  if (!exp || Number.isNaN(Number(exp))) return false
  const nowSec = Math.floor(Date.now() / 1000)
  return Number(exp) <= nowSec
}

function socketAuthFromToken(token) {
  const raw = normalizeToken(token)
  if (!raw) return undefined
  const bearer = `Bearer ${raw}`
  return {
    token: bearer,
    rawToken: raw,
    authorization: bearer,
    Authorization: bearer,
    __mode: 'bearer',
  }
}

function messageFromError(err) {
  if (!err) return 'Socket error'
  if (typeof err === 'string') return err

  const responseData = err?.response?.data
  if (typeof responseData === 'string' && responseData.trim()) return responseData
  if (responseData && typeof responseData === 'object') {
    const msg = responseData.message || responseData.error
    if (typeof msg === 'string' && msg.trim()) return msg
    try {
      return JSON.stringify(responseData)
    } catch {
      // ignore
    }
  }

  const candidates = [
    err?.message,
    err?.data?.message,
    err?.data?.error,
    err?.error,
    err?.reason,
    err?.description,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c
  }

  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

function isAuthError(err) {
  const text = messageFromError(err).toLowerCase()
  return (
    text.includes('forbidden') ||
    text.includes('unauthorized') ||
    text.includes('invalid token') ||
    text.includes('jwt') ||
    text.includes('not authenticated')
  )
}

function toRawAuth(auth) {
  const raw = auth?.rawToken
  if (!raw) return auth
  return {
    ...auth,
    token: raw,
    __mode: 'raw',
  }
}

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  authenticated: false,
  lastError: null,
  authToken: null,
  activeGameId: null,
  leaderboardData: [],
  onlineCount: 0,

  setLastError: (err) => set({ lastError: messageFromError(err) }),
  clearError: () => set({ lastError: null }),
  updateLeaderboard: (data) => {
    const list = Array.isArray(data?.leaderboard) ? data.leaderboard : Array.isArray(data) ? data : []
    set({ leaderboardData: list })
  },
  setOnlineCount: (count) => set({ onlineCount: Math.max(0, Number(count) || 0) }),

  connect: (token) => {
    const normalizedToken = normalizeToken(token) || normalizeToken(readTokenFromStorage())
    if (!normalizedToken) {
      set({ lastError: 'Missing auth token', connected: false })
      return null
    }
    if (isTokenExpired(normalizedToken)) {
      set({ lastError: 'Authentication failed: token expired', connected: false })
      return null
    }

    const authPayload = socketAuthFromToken(normalizedToken)
    if (SOCKET_DEBUG) {
      console.log('[socket] connect requested', {
        hasToken: Boolean(normalizedToken),
        tokenLength: normalizedToken.length,
      })
    }

    const existing = get().socket
    const existingToken = get().authToken
    if (existing && existingToken === normalizedToken) {
      existing.auth = authPayload
      if (SOCKET_DEBUG) console.log('[socket] reuse existing socket')
      if (!existing.connected) existing.connect()
      return existing
    }

    if (existing) {
      existing.off()
      existing.disconnect()
      set({ socket: null, connected: false, authToken: null })
    }

    const socket = createSocket(normalizedToken)
    socket.auth = authPayload

    const onConnect = () => {
      if (SOCKET_DEBUG) console.log('[socket] connected', socket.id)
      if (SOCKET_DEBUG) {
        const engine = socket.io?.engine
        const transport = engine?.transport?.name
        if (transport) console.log('[socket] transport', transport)

        if (engine && !engine.__ttproUpgradeLogger) {
          engine.__ttproUpgradeLogger = true
          engine.on('upgrade', () => {
            try {
              console.log('[socket] upgraded transport', engine.transport?.name)
            } catch {
              // ignore
            }
          })
        }
      }
      set({ connected: true, authenticated: false, lastError: null })
      // Compatibility with servers using event-based auth after connect.
      socket.emit('auth:login', { token: `Bearer ${normalizedToken}` })
      const activeGameId = get().activeGameId
      if (activeGameId) socket.emit('game:join', { gameId: activeGameId })
    }
    const onDisconnect = (reason) => {
      if (SOCKET_DEBUG) console.log('[socket] disconnected', reason)
      set({ connected: false })
    }
    const onConnectError = (err) => {
      const msg = messageFromError(err)
      const currentAuth = socket.auth
      const usingBearer = currentAuth?.__mode !== 'raw'
      if (SOCKET_DEBUG) console.log('[socket] connect_error', { msg, authMode: currentAuth?.__mode })
      if (isAuthError(err)) {
        // Compatibility fallback: some servers expect raw JWT in `auth.token`.
        if (usingBearer && currentAuth?.rawToken) {
          if (SOCKET_DEBUG) console.log('[socket] retrying auth with raw token mode')
          socket.auth = toRawAuth(currentAuth)
          socket.connect()
          return
        }
        set({ connected: false, lastError: `Authentication failed: ${msg}` })
        return
      }
      set({ connected: false, lastError: msg })
    }
    const onAuthSuccess = () => {
      set({ authenticated: true, lastError: null })
      const activeGameId = get().activeGameId
      if (activeGameId) socket.emit('game:join', { gameId: activeGameId })
    }
    const onAuthError = (err) => {
      const msg = messageFromError(err)
      set({ authenticated: false, lastError: `Authentication failed: ${msg}` })
    }
    const onGameUpdate = (payload) => {
      const normalized = normalizeGamePayload(payload)
      if (normalized) useGameStore.getState().applyServerState(normalized)
    }
    const onGameOver = (payload) => {
      const normalized = normalizeGamePayload(payload)
      if (normalized) useGameStore.getState().applyServerState({ ...normalized, status: 'finished' })
    }
    const onRematch = (payload) => {
      const normalized = normalizeGamePayload(payload)
      if (normalized) {
        useGameStore.getState().applyServerState({ ...normalized, status: 'playing' })
        return
      }

      useGameStore.getState().applyServerState({
        board: Array.from({ length: 9 }, () => null),
        winner: null,
        isDraw: false,
        winningLine: null,
        frozenPlayer: null,
        status: 'playing',
      })
    }
    const onGameError = (err) => set({ lastError: messageFromError(err) })
    const onUserSearchResult = (payload) => {
      const users = Array.isArray(payload?.users)
        ? payload.users
        : Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload?.data?.users)
            ? payload.data.users
            : Array.isArray(payload?.data?.results)
              ? payload.data.results
              : Array.isArray(payload)
                ? payload
                : []
      useAppStore.getState().setUserSearchResults(users)
    }
    const onFriendRequestReceived = (payload) => {
      const nestedFrom =
        payload?.request?.from ||
        payload?.data?.from ||
        payload?.friendRequest?.from ||
        payload?.request?.fromUser ||
        payload?.data?.fromUser ||
        null
      const fromUser =
        payload?.fromUser ||
        payload?.from ||
        nestedFrom ||
        payload?.user ||
        payload?.sender ||
        null
      const fromIdFromObject =
        typeof fromUser === 'object' && fromUser
          ? fromUser?._id || fromUser?.id || fromUser?.userId || null
          : null
      const fromIdFromString = typeof fromUser === 'string' ? fromUser : null
      const username =
        fromUser?.username ||
        fromUser?.name ||
        fromUser?.displayName ||
        payload?.request?.fromUsername ||
        payload?.data?.fromUsername ||
        payload?.fromUsername ||
        payload?.fromName ||
        payload?.username ||
        null
      const fromUserId =
        fromIdFromObject ||
        fromIdFromString ||
        payload?.fromUserId ||
        payload?.request?.fromUserId ||
        payload?.data?.fromUserId ||
        null
      const requestId =
        payload?.requestId ||
        payload?.request?._id ||
        payload?.request?.id ||
        payload?._id ||
        payload?.id ||
        null
      const label =
        (typeof username === 'string' && username.trim()) ||
        (fromUserId ? `User ${String(fromUserId).slice(0, 6)}` : null) ||
        'Unknown user'
      useAppStore.getState().addNotification({
        type: 'friend_request',
        user: String(label),
        userObject:
          fromUser && typeof fromUser === 'object'
            ? {
                _id: fromUser?._id || fromUser?.id || null,
                username: fromUser?.username || null,
                name: fromUser?.name || fromUser?.displayName || fromUser?.username || null,
                avatar: fromUser?.avatar || null,
                avatarId: fromUser?.avatarId || null,
                avatarHue: fromUser?.avatarHue || null,
              }
            : null,
        fromUserId: fromUserId ? String(fromUserId) : null,
        requestId: requestId ? String(requestId) : null,
        payload,
      })
    }
    const onFriendAdded = (payload) => {
      const friend = payload?.friend || payload?.user || payload
      const username = friend?.username || friend?.name || friend?.displayName
      const friendId = friend?._id || friend?.id || null
      if (username) {
        useAppStore.getState().upsertFriend({
          username: String(username),
          status: friend?.status || 'online',
          avatarId: friend?.avatarId,
          avatarHue: friend?.avatarHue,
          _id: friendId ? String(friendId) : undefined,
          id: friendId ? String(friendId) : undefined,
        })
      }
      if (friendId) {
        useAppStore.getState().setPendingFriendRequest(friendId, false)
        useAppStore
          .getState()
          .dismissNotificationsBy(
            (n) => n?.type === 'friend_request' && String(n?.fromUserId || '') === String(friendId),
          )
      }
      window.dispatchEvent(new CustomEvent('xyxo:leaderboard:update'))
    }
    const onGameInviteReceived = (payload) => {
      const fromUser = payload?.fromUser || payload?.user || null
      const username =
        fromUser?.username || fromUser?.name || fromUser?.displayName || payload?.username || 'User'
      const gameId = payload?.gameId || payload?.roomId || payload?.game?._id || payload?.game?.id
      const fromUserId = fromUser?._id || fromUser?.id || payload?.fromUserId || null
      useAppStore.getState().addNotification({
        type: 'match_invite',
        user: String(username),
        roomId: gameId ? String(gameId) : null,
        fromUserId: fromUserId ? String(fromUserId) : null,
        payload,
      })
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('auth:success', onAuthSuccess)
    socket.on('auth:error', onAuthError)
    socket.on('game:update', onGameUpdate)
    socket.on('update_board', onGameUpdate)
    socket.on('game:over', onGameOver)
    socket.on('game_over', onGameOver)
    socket.on('rematch', onRematch)
    socket.on('game:error', onGameError)
    socket.on('user:search:result', onUserSearchResult)
    socket.on('friend:request:received', onFriendRequestReceived)
    socket.on('friend_request_received', onFriendRequestReceived)
    socket.on('friendRequestReceived', onFriendRequestReceived)
    socket.on('friend:added', onFriendAdded)
    socket.on('game:invite:received', onGameInviteReceived)
    socket.on('leaderboard:update', (data) => {
      const list = Array.isArray(data?.leaderboard) ? data.leaderboard : Array.isArray(data) ? data : []
      useSocketStore.getState().updateLeaderboard(list)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xyxo:leaderboard:update'))
      }
    })
    socket.on('online:count', (count) => {
      useSocketStore.getState().setOnlineCount(count)
    })
    socket.on('online_count', (count) => {
      useSocketStore.getState().setOnlineCount(count)
    })

    if (SOCKET_DEBUG) {
      socket.onAny((event, ...args) => {
        console.log('[socket] event', event, args)
      })
    }

    set({ socket, authToken: normalizedToken, authenticated: false })
    socket.connect()
    return socket
  },

  disconnect: () => {
    const socket = get().socket
    if (!socket) return

    socket.off()
    socket.disconnect()
    set({ socket: null, connected: false, authenticated: false, authToken: null, activeGameId: null })
  },

  joinGame: (gameId) => {
    const socket = get().socket
    if (!socket || !gameId) return

    if (get().activeGameId === gameId) return
    set({ activeGameId: gameId })
    if (socket.connected) socket.emit('game:join', { gameId })
  },

  sendMove: ({ gameId, index }) => {
    const socket = get().socket
    if (!socket || !gameId) return
    socket.emit('game:move', { gameId, index })
  },

  requestRematch: (gameId) => {
    const socket = get().socket
    if (!socket) return
    if (!gameId) return
    if (SOCKET_DEBUG) console.log('[socket] emit game:rematch', { gameId })
    socket.emit('game:rematch', { gameId })

    // Backwards-compat: some servers use `rematch` with either a payload object or raw id.
    if (SOCKET_DEBUG) console.log('[socket] emit rematch', { gameId })
    socket.emit('rematch', { gameId })
    socket.emit('rematch', gameId)
  },

  searchUsers: (query) => {
    const socket = get().socket
    if (!socket || !socket.connected) return
    const q = String(query ?? '').trim()
    if (!q) return
    // Support both payload shapes used by different backend implementations.
    socket.emit('user:search', { q, query: q }, (ack) => {
      const users = Array.isArray(ack?.users)
        ? ack.users
        : Array.isArray(ack?.results)
          ? ack.results
          : Array.isArray(ack?.data?.users)
            ? ack.data.users
            : Array.isArray(ack?.data?.results)
              ? ack.data.results
              : Array.isArray(ack)
                ? ack
                : null
      if (users) useAppStore.getState().setUserSearchResults(users)
    })
  },

  requestFriend: (toUserId) => {
    const socket = get().socket
    if (!socket || !socket.connected) {
      if (SOCKET_DEBUG) console.log('[socket] friend request skipped: socket not connected')
      return
    }
    if (!toUserId) {
      if (SOCKET_DEBUG) console.log('[socket] friend request skipped: missing toUserId')
      return
    }
    const payload = { toUserId: String(toUserId), userId: String(toUserId), to: String(toUserId) }
    if (SOCKET_DEBUG) {
      console.log('[socket] emit friend request', {
        connected: socket.connected,
        event: 'friend:request',
        payload,
      })
    }
    useAppStore.getState().setPendingFriendRequest(toUserId, true)
    // Emit multiple compatible event names for backend variations.
    socket.emit('friend:request', payload)
    socket.emit('friend_request', payload)
    socket.emit('friendRequest', payload)
  },

  acceptFriendRequest: async ({ fromUserId, requestId }) => {
    const socket = get().socket
    const rid = requestId ? String(requestId) : null
    if (!socket || !socket.connected) return
    if (!fromUserId && !rid) return
    socket.emit('friend:accept', {
      fromUserId: fromUserId ? String(fromUserId) : undefined,
      requestId: rid ? String(rid) : undefined,
    })
    if (rid) {
      const { acceptFriendRequest: acceptApi } = await import('../api/user.api')
      try {
        await acceptApi(rid)
      } catch {
        // socket event may have handled it
      }
    }
  },

  inviteToGame: ({ toUserId, gameId }) => {
    const socket = get().socket
    if (!socket || !socket.connected) return
    if (!toUserId || !gameId) return
    socket.emit('game:invite', { toUserId, gameId })
  },

  acceptGameInvite: ({ gameId }) => {
    const socket = get().socket
    if (!socket || !socket.connected) return
    if (!gameId) return
    socket.emit('game:invite:accept', { gameId })
  },

  rejectGameInvite: ({ gameId, fromUserId }) => {
    const socket = get().socket
    if (!socket || !socket.connected) return
    socket.emit('game:invite:reject', { gameId, fromUserId })
  },
}))
