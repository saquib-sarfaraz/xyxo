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

export function connectSocket({ url, auth } = {}) {
  if (socket) {
    if (!socket.connected) socket.connect()
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
    transports: ['websocket'],
    auth: socketAuth,
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
  socket?.emit('join_room', { roomId })
}

export function sendMove(index) {
  if (!currentRoomId) return
  socket?.emit('send_move', { gameId: currentRoomId, index })
}

export function requestRematch() {
  if (!currentRoomId || !socket) return
  socket.emit('game:rematch', { gameId: currentRoomId })
}
