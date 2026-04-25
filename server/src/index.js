import 'dotenv/config'
import http from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { createApp } from './app.js'

const PORT = Number.parseInt(process.env.PORT || '5001', 10) || 5001
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xyxo'
const isProduction = process.env.NODE_ENV === 'production'
const isDev = !isProduction
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET

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

const games = new Map()

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ]
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  return null
}

function emitGame(game, io) {
  io.to(game.id).emit('update_board', {
    board: game.board,
    turn: game.turn,
    winner: game.winner,
    isDraw: game.isDraw,
    winningLine: game.winningLine,
    frozenPlayer: game.frozenPlayer,
    status: game.status,
    powerUps: game.powerUps,
    rematchVotes: game.rematchVotes || [],
    players: game.players.map((id, idx) => ({
      userId: id,
      symbol: idx === 0 ? 'X' : 'O',
    })),
  })
}

function createGame(gameId) {
  return {
    id: gameId,
    board: Array(9).fill(null),
    turn: 'X',
    winner: null,
    isDraw: false,
    winningLine: null,
    frozenPlayer: null,
    players: [],
    playerSymbols: {},
    powerUps: {
      X: { freeze: 1, remove: 1 },
      O: { freeze: 1, remove: 1 },
    },
    status: 'waiting',
    rematchVotes: [],
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI)
  if (isDev) console.log('[db] connected')

  const httpServer = http.createServer()
  const io = new Server(httpServer, {
    cors: { origin: origins.length ? origins : true, credentials: true },
  })
  const app = createApp({ io })
  httpServer.on('request', app)

  // Socket.io authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.auth?.rawToken
    if (!token) {
      return next(new Error('Authentication error: token required'))
    }
    const rawToken = token.replace(/^Bearer\s+/i, '').trim()
    jwt.verify(rawToken, ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.error('[socket] auth error:', err.message)
        return next(new Error('Authentication error: invalid token'))
      }
      socket.user = decoded
      next()
    })
  })

  io.on('connection', (socket) => {
        if (isDev) console.log('[socket] connected', socket.id, 'user:', socket.user?.sub)
        socket.emit('server:ready', { at: Date.now() })

        socket.on('join_room', ({ roomId }) => {
          if (!roomId) return
          socket.join(roomId)

          let game = games.get(roomId)
          if (!game) {
            game = createGame(roomId)
            games.set(roomId, game)
          }

          const userId = socket.user?.sub || socket.id
          if (!game.players.includes(userId)) {
            if (game.players.length < 2) {
              game.players.push(userId)
              const symbol = game.players.length === 1 ? 'X' : 'O'
              game.playerSymbols[userId] = symbol
            }
          }

          if (game.players.length === 2 && game.status === 'waiting') {
            game.status = 'playing'
          }

          emitGame(game, io)
        })

        socket.on('send_move', ({ gameId, index }) => {
          const game = games.get(gameId)
          if (!game) {
            return
          }

          const userId = socket.user?.sub || socket.id
          const playerSymbol = game.playerSymbols[userId]
          if (!playerSymbol) {
            return
          }

          if (game.status !== 'playing') {
            return
          }

          if (game.turn !== playerSymbol) {
            return
          }

          if (game.board[index] !== null) {
            return
          }

          if (game.frozenPlayer === playerSymbol) {
            game.frozenPlayer = null
            game.turn = playerSymbol === 'X' ? 'O' : 'X'
            emitGame(game, io)
            return
          }

          game.board[index] = playerSymbol

          const winLine = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].find(([a,b,c]) => 
            game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]
          )
          
          if (winLine) {
            game.winner = playerSymbol
            game.winningLine = winLine
            game.status = 'finished'
          } else if (game.board.every(cell => cell !== null)) {
            game.winner = 'draw'
            game.isDraw = true
            game.status = 'finished'
          } else {
            game.turn = playerSymbol === 'X' ? 'O' : 'X'
          }

          emitGame(game, io)
        })

        socket.on('game:freeze', ({ gameId }) => {
          const game = games.get(gameId)
          if (!game) return

          const userId = socket.user?.sub || socket.id
          const playerSymbol = game.playerSymbols[userId]
          if (!playerSymbol) return

          if (game.status !== 'playing') return
          if (game.turn !== playerSymbol) return
          if (game.powerUps[playerSymbol].freeze <= 0) {
            return
          }

          const opponent = playerSymbol === 'X' ? 'O' : 'X'
          game.frozenPlayer = opponent
          game.powerUps[playerSymbol].freeze--

          emitGame(game, io)
        })

        socket.on('game:remove', ({ gameId, index }) => {
          const game = games.get(gameId)
          if (!game) return

          const userId = socket.user?.sub || socket.id
          const playerSymbol = game.playerSymbols[userId]
          if (!playerSymbol) return

          if (game.status !== 'playing') return
          if (game.turn !== playerSymbol) return
          if (game.powerUps[playerSymbol].remove <= 0) {
            return
          }

          const opponent = playerSymbol === 'X' ? 'O' : 'X'
          
          if (game.board[index] !== opponent) {
            return
          }

          game.board[index] = null
          game.powerUps[playerSymbol].remove--

          emitGame(game, io)
        })

        socket.on('game:rematch', ({ gameId }) => {
          const game = games.get(gameId)
          if (!game) return

          const userId = socket.user?.sub || socket.id

          if (!game.rematchVotes) {
            game.rematchVotes = []
          }

          if (!game.rematchVotes.includes(userId)) {
            game.rematchVotes.push(userId)
          }

          if (game.rematchVotes.length === 2) {
            game.board = Array(9).fill(null)
            game.turn = Math.random() > 0.5 ? 'X' : 'O'
            game.winner = null
            game.isDraw = false
            game.winningLine = null
            game.frozenPlayer = null
            game.powerUps = {
              X: { freeze: 1, remove: 1 },
              O: { freeze: 1, remove: 1 },
            }
            game.status = game.players.length === 2 ? 'playing' : 'waiting'
            game.rematchVotes = []

            emitGame(game, io)
            io.to(gameId).emit('rematch', { reset: true })
            return
          }

          io.to(gameId).emit('rematch:request', { from: userId })
        })

        socket.on('disconnect', () => {
          if (isDev) console.log('[socket] disconnected', socket.id)
        })
      })

  httpServer.listen(PORT, () => {
    if (isDev) {
      console.log(`[http] http://localhost:${PORT}`)
      console.log(`[env] ${isProduction ? 'production' : 'development'}`)
      console.log(`[api] GET http://localhost:${PORT}/api/health`)
    }
  })
}

main().catch((err) => {
  console.error('[fatal]', err?.message || err)
  process.exit(1)
})