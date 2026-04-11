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

function createGame(gameId) {
  return {
    id: gameId,
    board: Array(9).fill(null),
    turn: 'X',
    winner: null,
    isDraw: false,
    winningLine: null,
    players: [],
    playerSymbols: {},
    status: 'waiting',
  }
}

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
    console.log('[socket] connected', socket.id)
    socket.emit('server:ready', { at: Date.now() })

    socket.on('join_room', ({ roomId }) => {
      if (!roomId) return
      socket.join(roomId)
      console.log('[socket] join_room', roomId, socket.id)

      let game = games.get(roomId)
      if (!game) {
        game = createGame(roomId)
        games.set(roomId, game)
      }

      const userId = socket.handshake.auth?.token || socket.id
      if (!game.players.includes(userId)) {
        if (game.players.length < 2) {
          game.players.push(userId)
          const symbol = game.players.length === 1 ? 'X' : 'O'
          game.playerSymbols[userId] = symbol
          console.log('[socket] player assigned', userId, symbol)
        }
      }

      if (game.players.length === 2 && game.status === 'waiting') {
        game.status = 'playing'
      }

      io.to(roomId).emit('update_board', {
        board: game.board,
        turn: game.turn,
        winner: game.winner,
        isDraw: game.isDraw,
        winningLine: game.winningLine,
        status: game.status,
        players: game.players.map((id, idx) => ({
          userId: id,
          symbol: idx === 0 ? 'X' : 'O',
        })),
      })
    })

    socket.on('send_move', ({ gameId, index }) => {
      const game = games.get(gameId)
      if (!game) {
        console.log('[socket] game not found', gameId)
        return
      }

      const userId = socket.handshake.auth?.token || socket.id
      const playerSymbol = game.playerSymbols[userId]
      if (!playerSymbol) {
        console.log('[socket] player not in game', userId)
        return
      }

      if (game.status !== 'playing') {
        console.log('[socket] game not playing', game.status)
        return
      }

      if (game.turn !== playerSymbol) {
        console.log('[socket] not your turn', playerSymbol, game.turn)
        return
      }

      if (game.board[index] !== null) {
        console.log('[socket] tile already taken', index)
        return
      }

      console.log('[socket] move', playerSymbol, index)

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

      io.to(gameId).emit('update_board', {
        board: game.board,
        turn: game.turn,
        winner: game.winner,
        isDraw: game.isDraw,
        winningLine: game.winningLine,
        status: game.status,
        players: game.players.map((id, idx) => ({
          userId: id,
          symbol: idx === 0 ? 'X' : 'O',
        })),
      })
    })

    socket.on('game:rematch', ({ gameId }) => {
      const game = games.get(gameId)
      if (!game) return

      console.log('[socket] rematch', gameId)

      game.board = Array(9).fill(null)
      game.turn = 'X'
      game.winner = null
      game.isDraw = false
      game.winningLine = null
      game.status = game.players.length === 2 ? 'playing' : 'waiting'

      io.to(gameId).emit('update_board', {
        board: game.board,
        turn: game.turn,
        winner: game.winner,
        isDraw: game.isDraw,
        winningLine: game.winningLine,
        status: game.status,
        players: game.players.map((id, idx) => ({
          userId: id,
          symbol: idx === 0 ? 'X' : 'O',
        })),
      })
      io.to(gameId).emit('rematch')
    })

    socket.on('disconnect', () => {
      console.log('[socket] disconnected', socket.id)
    })
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
