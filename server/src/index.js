import 'dotenv/config'
import http from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import { createApp } from './app.js'

const PORT = Number.parseInt(process.env.PORT || '5001', 10) || 5001
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xyxo'
const isProduction = process.env.NODE_ENV === 'production'

function getCorsOrigins() {
  const clientUrl = process.env.CLIENT_URL?.trim()
  if (clientUrl) {
    const httpsUrl = clientUrl.replace(/^http:/, 'https:')
    const httpUrl = clientUrl.replace(/^https:/, 'http:')
    return [clientUrl, httpsUrl, httpUrl].filter(Boolean)
  }
  return (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const origins = getCorsOrigins()

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('[db] connected')

  const httpServer = http.createServer()
  const io = new Server(httpServer, {
    cors: { origin: origins.length ? origins : true, credentials: true },
  })
  const app = createApp({ io })
  httpServer.on('request', app)

  io.on('connection', (socket) => {
    socket.emit('server:ready', { at: Date.now() })
  })

  httpServer.listen(PORT, () => {
    console.log(`[http] http://localhost:${PORT}`)
    console.log(`[env] ${isProduction ? 'production' : 'development'}`)
    console.log(`[api] GET http://localhost:${PORT}/api/health`)
  })
}

main().catch((err) => {
  console.error('[fatal]', err?.message || err)
  process.exit(1)
})
