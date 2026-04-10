import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'
const TRANSPORT = String(import.meta.env.VITE_SOCKET_TRANSPORT || '').toLowerCase()

function transportsFromEnv() {
  if (TRANSPORT === 'websocket') return ['websocket']
  if (TRANSPORT === 'polling') return ['polling']
  // Default to websocket-only for stable realtime behavior.
  return ['websocket']
}

export function createSocket(token) {
  const normalized = typeof token === 'string' ? token.trim() : ''
  const rawToken = normalized.toLowerCase().startsWith('bearer ')
    ? normalized.slice(7).trim()
    : normalized
  const bearerToken = rawToken ? `Bearer ${rawToken}` : ''

  return io(SOCKET_URL, {
    autoConnect: false,
    transports: transportsFromEnv(),
    // Primary handshake format: Bearer token in `auth.token`.
    // Also provide raw token for servers that verify directly.
    auth: rawToken
      ? {
          token: bearerToken,
          rawToken,
          authorization: bearerToken,
          Authorization: bearerToken,
        }
      : undefined,
  })
}
