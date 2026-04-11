import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const WINNING_PATTERNS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function checkWinner(board) {
  for (const [a, b, c] of WINNING_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], pattern: [a, b, c] }
    }
  }
  return null
}

function checkDraw(board) {
  return board.every((cell) => cell !== null)
}

function getNextTurn(current) {
  return current === 'X' ? 'O' : 'X'
}

function isValidTurn(turn) {
  return turn === 'X' || turn === 'O'
}

function emptyBoard() {
  return Array.from({ length: 9 }, () => null)
}

function isValidBoard(board) {
  return Array.isArray(board) && board.length === 9
}

function isPlayerSymbol(value) {
  return value === 'X' || value === 'O'
}

function safeString(value, fallback = '') {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function extractServerPlayerId(p) {
  if (!p) return null
  return p.userId ?? p.user?._id ?? p.user?.id ?? p._id ?? p.id ?? null
}

function extractServerPlayerName(p, fallback) {
  if (!p) return fallback
  const direct = p.name ?? p.displayName ?? p.username
  if (direct) return safeString(direct, fallback)
  const nested = p.user?.name ?? p.user?.displayName ?? p.user?.username
  if (nested) return safeString(nested, fallback)
  return fallback
}

function extractServerPlayerAvatarId(p) {
  if (!p) return undefined
  return p.avatarId ?? p.user?.avatarId
}

function extractServerPlayerHue(p, fallback) {
  const hue = p?.avatarHue ?? p?.user?.avatarHue
  return typeof hue === 'number' && Number.isFinite(hue) ? hue : fallback
}

function normalizeServerPlayers({ serverPlayers, currentPlayers, myUserId }) {
  if (!Array.isArray(serverPlayers)) return null

  const players = { ...currentPlayers }
  let mySymbol = null

  for (let i = 0; i < serverPlayers.length; i += 1) {
    const raw = serverPlayers[i]

    let symbol = ''
    if (raw && typeof raw === 'object') {
      symbol = safeString(raw.symbol ?? raw.mark ?? raw.side, '')
    }

    if (!symbol) {
      symbol = i === 0 ? 'X' : i === 1 ? 'O' : ''
    }

    symbol = symbol.toUpperCase()
    if (!isPlayerSymbol(symbol)) continue

    const fallbackName = symbol === 'X' ? 'Player X' : 'Player O'
    const name =
      raw && typeof raw === 'object'
        ? extractServerPlayerName(raw, fallbackName)
        : fallbackName
    const avatarHue =
      raw && typeof raw === 'object'
        ? extractServerPlayerHue(raw, symbol === 'X' ? 190 : 285)
        : symbol === 'X'
          ? 190
          : 285
    const avatarId = raw && typeof raw === 'object' ? extractServerPlayerAvatarId(raw) : undefined

    players[symbol] = { ...(players[symbol] ?? {}), name, avatarHue, avatarId }

    const pid =
      raw && typeof raw === 'object'
        ? extractServerPlayerId(raw)
        : typeof raw === 'string' || typeof raw === 'number'
          ? raw
          : null
    if (myUserId && pid && String(pid) === String(myUserId)) {
      mySymbol = symbol
    }
  }

  return { players, mySymbol }
}

const INITIAL_STATE = {
  roomId: null,
  mode: 'local', // local | ai | socket
  status: 'idle', // idle | playing | finished | connecting
  board: emptyBoard(),
  serverPlayers: null,
  myUserId: null,
  mySymbol: null,
  startingTurn: 'X',
  turn: 'X',
  winner: null,
  isDraw: false,
  winningLine: null,
  players: {
    X: { name: 'Player X', avatarHue: 190 },
    O: { name: 'Player O', avatarHue: 285 },
  },
  scores: { X: 0, O: 0 },
  powerUps: {
    X: { freeze: 1, remove: 1 },
    O: { freeze: 1, remove: 1 },
  },
  frozenPlayer: null, // X | O | null
  removeArmed: false,
  resultModalOpen: false,
  rematchRequest: false,
}

export const useGameStore = create(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      configure: ({ roomId, mode, players, myUserId }) => {
        set((state) => ({
          roomId: roomId ?? state.roomId,
          mode: mode ?? state.mode,
          players: players ?? state.players,
          myUserId: myUserId ?? state.myUserId,
        }))
      },

      startMatch: ({ resetScores } = {}) => {
        const randomTurn = Math.random() > 0.5 ? 'X' : 'O'

        set((state) => ({
          ...state,
          status: 'playing',
          board: emptyBoard(),
          startingTurn: randomTurn,
          turn: randomTurn,
          winner: null,
          isDraw: false,
          winningLine: null,
          powerUps: {
            X: { freeze: 1, remove: 1 },
            O: { freeze: 1, remove: 1 },
          },
          frozenPlayer: null,
          removeArmed: false,
          resultModalOpen: false,
          rematchRequest: false,
          scores: resetScores ? { X: 0, O: 0 } : state.scores,
        }))
      },

      resetGame: () => {
        set({ ...INITIAL_STATE })
      },

      armRemove: () => {
        set((state) => {
          if (state.status !== 'playing') return state
          if (state.winner || state.isDraw) return state
          if (state.powerUps?.[state.turn]?.remove <= 0) return state
          return { ...state, removeArmed: true }
        })
      },

      cancelRemove: () => set({ removeArmed: false }),

      activateFreeze: () => {
        set((state) => {
          if (state.status !== 'playing') return state
          if (state.winner || state.isDraw) return state

          const current = state.turn
          const next = getNextTurn(current)

          if (state.powerUps?.[current]?.freeze <= 0) return state
          if (state.frozenPlayer) return state

          return {
            ...state,
            powerUps: {
              ...state.powerUps,
              [current]: {
                ...state.powerUps[current],
                freeze: state.powerUps[current].freeze - 1,
              },
            },
            frozenPlayer: next,
          }
        })
      },

      pressTile: (index) => {
        set((state) => {
          if (state.status !== 'playing') return state
          if (state.winner || state.isDraw) return state
          if (index < 0 || index > 8) return state

          const baseBoard = isValidBoard(state.board) ? state.board : emptyBoard()

          if (state.removeArmed) {
            const current = state.turn
            const opponent = getNextTurn(current)

            if (state.powerUps?.[current]?.remove <= 0) {
              return { ...state, removeArmed: false }
            }

            if (baseBoard[index] !== opponent) return state

            const board = baseBoard.slice()
            board[index] = null

            return {
              ...state,
              board,
              powerUps: {
                ...state.powerUps,
                [current]: {
                  ...state.powerUps[current],
                  remove: state.powerUps[current].remove - 1,
                },
              },
              removeArmed: false,
            }
          }

          if (baseBoard[index]) return state

          const board = baseBoard.slice()
          board[index] = state.turn

          const win = checkWinner(board)
          const winner = win?.player ?? null
          const winningLine = win?.pattern ?? null
          const isDraw = !winner && checkDraw(board)

          let nextTurn = getNextTurn(state.turn)
          if (!winner && !isDraw && state.frozenPlayer === nextTurn) {
            nextTurn = state.turn
          }

          const nextScores = winner
            ? { ...state.scores, [winner]: state.scores[winner] + 1 }
            : state.scores
          const finished = Boolean(winner) || isDraw

          return {
            ...state,
            board,
            turn: finished ? state.turn : nextTurn,
            winner,
            isDraw,
            winningLine,
            frozenPlayer: null,
            removeArmed: false,
            status: finished ? 'finished' : 'playing',
            scores: nextScores,
            resultModalOpen: finished,
          }
        })
      },

      dismissResultModal: () => set({ resultModalOpen: false }),

      setRematchRequest: (show) => set({ rematchRequest: show }),

      clearRematchRequest: () => set({ rematchRequest: false }),

      applyServerState: (payload) => {
        if (!payload || typeof payload !== 'object') return
        set((state) => {
          const nextServerPlayers = Array.isArray(payload.players) ? payload.players : state.serverPlayers
          const normalizedPlayers = Array.isArray(nextServerPlayers)
            ? normalizeServerPlayers({
                serverPlayers: nextServerPlayers,
                currentPlayers: state.players,
                myUserId: state.myUserId,
              })
            : null

          const nextBoard = isValidBoard(payload.board) ? payload.board : state.board

          const shouldCloseModalOnReset =
            isValidBoard(payload.board) &&
            payload.board.every((c) => c === null) &&
            (payload.winner === null || payload.winner === undefined) &&
            (payload.isDraw === false || payload.isDraw === undefined)

          return {
            ...state,
            board: nextBoard,
            serverPlayers: nextServerPlayers,
            mySymbol: normalizedPlayers?.mySymbol ?? state.mySymbol,
            players: normalizedPlayers?.players ?? state.players,
            startingTurn: isValidTurn(payload.startingTurn) ? payload.startingTurn : state.startingTurn,
            turn: payload.turn ?? state.turn,
            winner: payload.winner ?? state.winner,
            isDraw: payload.isDraw ?? state.isDraw,
            winningLine: payload.winningLine ?? state.winningLine,
            powerUps: payload.powerUps ?? state.powerUps,
            frozenPlayer: payload.frozenPlayer ?? state.frozenPlayer,
            status: payload.status ?? state.status,
            resultModalOpen:
              payload.winner || payload.isDraw
                ? true
                : shouldCloseModalOnReset
                  ? false
                  : payload.winner === null && payload.isDraw === false
                    ? false
                    : state.resultModalOpen,
          }
        })
      },
    }),
    {
      name: 'ttpro:game',
      version: 1,
      partialize: (state) => ({
        roomId: state.roomId,
        mode: state.mode,
        status: state.status,
        board: state.board,
        startingTurn: state.startingTurn,
        turn: state.turn,
        winner: state.winner,
        isDraw: state.isDraw,
        winningLine: state.winningLine,
        serverPlayers: state.serverPlayers,
        myUserId: state.myUserId,
        mySymbol: state.mySymbol,
        players: state.players,
        scores: state.scores,
        powerUps: state.powerUps,
        frozenPlayer: state.frozenPlayer,
        removeArmed: state.removeArmed,
        resultModalOpen: state.resultModalOpen,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState ?? {}
        const next = { ...currentState, ...persisted }
        next.board = isValidBoard(persisted?.board) ? persisted.board : currentState.board
        next.startingTurn = isValidTurn(persisted?.startingTurn)
          ? persisted.startingTurn
          : currentState.startingTurn
        next.serverPlayers = Array.isArray(persisted?.serverPlayers)
          ? persisted.serverPlayers
          : currentState.serverPlayers
        next.myUserId = persisted?.myUserId ?? currentState.myUserId
        next.mySymbol = persisted?.mySymbol ?? currentState.mySymbol
        return next
      },
    },
  ),
)
