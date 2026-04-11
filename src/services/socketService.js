import { io } from 'socket.io-client'
import { TOKEN_KEY } from '../api/axios'

let socket = null
let currentRoomId = null

function socketUrl() {
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'
}

export function getSocket() {
  return socket
}

export function isConnected() {
  return socket?.connected === true
}

export function connectSocket({ url, auth } = {}) {
  if (socket && socket.connected) {
    return socket
  }

  if (socket) {
    socket.connect()
    return socket
  }

  const tokenFromStorage = (() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token')
    } catch {
      return null
    }
  })()
  const raw = tokenFromStorage ? String(tokenFromStorage).trim() : ''
  const bearer = raw
    ? raw.toLowerCase().startsWith('bearer ')
      ? raw
      : `Bearer ${raw}`
    : ''
  const socketAuth = auth || (bearer ? { token: bearer } : undefined)

  socket = io(url ?? socketUrl(), {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: socketAuth,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })
  
  socket.on('connect', () => {
    console.log('[socket] connected', socket.id)
    if (currentRoomId) {
      socket.emit('game:join', { gameId: currentRoomId })
    }
  })
  
  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason)
  })
  
  socket.on('connect_error', (err) => {
    console.error('[socket] connection error:', err.message)
  })
  
  if (socketAuth) socket.connect()

  return socket
}

export function disconnectSocket() {
  currentRoomId = null
  if (!socket) return
  socket.disconnect()
  socket = null
}

export function joinRoom(roomId) {
  currentRoomId = roomId
  if (socket?.connected) {
    socket.emit('game:join', { gameId: roomId })
  }
}

export function sendMove(index) {
  if (!currentRoomId || !socket?.connected) return
  socket.emit('game:move', { gameId: currentRoomId, index })
}

export function requestRematch() {
  if (!currentRoomId || !socket?.connected) return
  socket.emit('game:rematch', { gameId: currentRoomId })
}

export function sendFreeze() {
  if (!currentRoomId || !socket?.connected) return
  socket.emit('game:freeze', { gameId: currentRoomId })
}

export function sendRemove(index) {
  if (!currentRoomId || !socket?.connected) return
  socket.emit('game:remove', { gameId: currentRoomId, targetIndex: index })
}
