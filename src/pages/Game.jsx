import { motion as Motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Fireworks from '../components/Fireworks'
import GameBoard from '../components/GameBoard'
import Modal from '../components/Modal'
import PlayerHUD from '../components/PlayerHUD'
import PowerUps from '../components/PowerUps'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import { useGameStore } from '../store/useGameStore'
import { useSocketStore } from '../store/useSocketStore'
import { useUserStore } from '../store/useUserStore'
import {
  isSoundMuted,
  playSound,
  setSoundMuted,
  startBackgroundMusic,
  stopAllSounds,
  stopBackgroundMusic,
  unlockSounds,
} from '../utils/sound'

const FALLBACK_BOARD = Array.from({ length: 9 }, () => null)
const ROUND_RESTART_SECONDS = 3

function checkWinner(board) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
  for (const [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  if (board.every(Boolean)) return 'draw'
  return null
}

function minimax(board, isMaximizing, aiMark = 'O', humanMark = 'X') {
  const result = checkWinner(board)
  if (result === aiMark) return 1
  if (result === humanMark) return -1
  if (result === 'draw') return 0

  if (isMaximizing) {
    let best = -Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = aiMark
        const score = minimax(board, false, aiMark, humanMark)
        board[i] = null
        best = Math.max(score, best)
      }
    }
    return best
  } else {
    let best = Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = humanMark
        const score = minimax(board, true, aiMark, humanMark)
        board[i] = null
        best = Math.min(score, best)
      }
    }
    return best
  }
}

function pickAiMove(board, difficulty = 'hard') {
  if (difficulty === 'easy') {
    const open = board.map((v, i) => (v ? null : i)).filter((v) => v !== null)
    if (!open.length) return null
    return open[Math.floor(Math.random() * open.length)]
  }

  if (difficulty === 'medium') {
    if (Math.random() < 0.3) {
      const open = board.map((v, i) => (v ? null : i)).filter((v) => v !== null)
      return open[Math.floor(Math.random() * open.length)]
    }
  }

  let bestScore = -Infinity
  let bestMoves = []

  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O'
      const score = minimax(board, false, 'O', 'X')
      board[i] = null

      if (score > bestScore) {
        bestScore = score
        bestMoves = [i]
      } else if (score === bestScore) {
        bestMoves.push(i)
      }
    }
  }

  if (!bestMoves.length) return null
  const delay = 200 + Math.random() * 300
  return { move: bestMoves[Math.floor(Math.random() * bestMoves.length)], delay }
}

export default function Game() {
  const params = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const user = useUserStore((s) => s.user)
  const continueAsGuest = useUserStore((s) => s.continueAsGuest)
  const recordMatchResult = useUserStore((s) => s.recordMatchResult)
  const addMatch = useAppStore((s) => s.addMatch)
  const token = useAuthStore((s) => s.token)
  const authHydrated = useAuthStore((s) => s.hydrated)
  const authUser = useAuthStore((s) => s.user)

  const status = useGameStore((s) => s.status)
  const rawBoard = useGameStore((s) => s.board)
  const startingTurn = useGameStore((s) => s.startingTurn)
  const turn = useGameStore((s) => s.turn)
  const winner = useGameStore((s) => s.winner)
  const isDraw = useGameStore((s) => s.isDraw)
  const winningLine = useGameStore((s) => s.winningLine)
  const players = useGameStore((s) => s.players)
	  const serverPlayers = useGameStore((s) => s.serverPlayers)
	  const mySymbol = useGameStore((s) => s.mySymbol)
	  const myUserId = useGameStore((s) => s.myUserId)
	  const scores = useGameStore((s) => s.scores)
	  const powerUps = useGameStore((s) => s.powerUps)
	  const removeArmed = useGameStore((s) => s.removeArmed)
	  const frozenPlayer = useGameStore((s) => s.frozenPlayer)
	  const resultModalOpen = useGameStore((s) => s.resultModalOpen)

  const configure = useGameStore((s) => s.configure)
  const startMatch = useGameStore((s) => s.startMatch)
  const pressTile = useGameStore((s) => s.pressTile)
  const armRemove = useGameStore((s) => s.armRemove)
  const cancelRemove = useGameStore((s) => s.cancelRemove)
  const activateFreeze = useGameStore((s) => s.activateFreeze)
  const dismissResultModal = useGameStore((s) => s.dismissResultModal)

  const socketConnected = useSocketStore((s) => s.connected)
  const socketLastError = useSocketStore((s) => s.lastError)
  const socketConnect = useSocketStore((s) => s.connect)
  const socketDisconnect = useSocketStore((s) => s.disconnect)
  const socketJoinGame = useSocketStore((s) => s.joinGame)
  const socketSendMove = useSocketStore((s) => s.sendMove)
  const socketSendFreeze = useSocketStore((s) => s.sendFreeze)
  const socketRequestRematch = useSocketStore((s) => s.requestRematch)

  const board = Array.isArray(rawBoard) && rawBoard.length === 9 ? rawBoard : FALLBACK_BOARD

  const routeMode = params.mode ? String(params.mode).toLowerCase() : null
  const roomIdFromParams = params.roomId

  const roomId = useMemo(() => {
    if (roomIdFromParams) return roomIdFromParams
    if (routeMode === 'ai') return 'ai'
    if (routeMode === 'online' || routeMode === 'socket') return 'online'
    if (routeMode === 'local') return 'local'
    return 'local'
  }, [roomIdFromParams, routeMode])

  const mode = useMemo(() => {
    if (routeMode === 'local') return 'local'
    if (routeMode === 'ai') return 'ai'
    if (routeMode === 'online' || routeMode === 'socket') return 'socket'
    if (routeMode) return 'local'

    if (roomId === 'local') return 'local'
    if (roomId.startsWith('ai-') || roomId === 'ai') return 'ai'
    if (roomId.startsWith('online-') || roomId.startsWith('on-')) return 'socket'
    return 'local'
  }, [roomId, routeMode])

  const [opponentNotice, setOpponentNotice] = useState('')
  const [roundRestartLeft, setRoundRestartLeft] = useState(0)
  const [showFireworks, setShowFireworks] = useState(false)
  const [soundMuted, setSoundMutedState] = useState(() => isSoundMuted())
  const [moveLocked, setMoveLocked] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  const prevPlayersCountRef = useRef(Array.isArray(serverPlayers) ? serverPlayers.length : 0)
  const joinedRoomRef = useRef(null)

	  const disabled = status !== 'playing' || Boolean(winner) || isDraw
	  const serverPlayerCount = Array.isArray(serverPlayers) ? serverPlayers.length : 0
  const inputLocked =
    mode === 'ai' && status === 'playing' && !winner && !isDraw && turn === 'O'
  const waitingForRole = mode === 'socket' && status === 'playing' && !mySymbol
  const boardDisabled =
    disabled ||
    inputLocked ||
    (mode === 'socket' && !socketConnected) ||
    moveLocked

  const authLoading = mode === 'socket' && !authHydrated
  const needsOnlineLogin = mode === 'socket' && authHydrated && !token
	  const missingOnlineRoomId = mode === 'socket' && !roomIdFromParams

	  const onlyPlayerIsMe = useMemo(() => {
	    if (!myUserId) return false
	    if (!Array.isArray(serverPlayers) || serverPlayers.length !== 1) return false
	    const first = serverPlayers[0]
	    const firstId =
	      first && typeof first === 'object'
	        ? first.userId ?? first.user?._id ?? first.user?.id ?? first._id ?? first.id ?? null
	        : first
	    if (!firstId) return false
	    return String(firstId) === String(myUserId)
	  }, [myUserId, serverPlayers])

  useEffect(() => {
    if (useUserStore.getState().user) return
    continueAsGuest('Player')
  }, [continueAsGuest])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onMuteChange = (e) => setSoundMutedState(Boolean(e?.detail?.muted))
    window.addEventListener('ttpro:mutechange', onMuteChange)
    return () => window.removeEventListener('ttpro:mutechange', onMuteChange)
  }, [])

	  useEffect(() => () => stopAllSounds(), [])

	  useEffect(() => {
	    if (mode !== 'socket') return
if (!authHydrated) return
 	    if (!token) return
 	    if (!roomIdFromParams) return
 	    if (socketConnected) return

     useGameStore.getState().applyServerState({
      board: Array.from({ length: 9 }, () => null),
      turn: 'X',
      winner: null,
      isDraw: false,
      winningLine: null,
      frozenPlayer: null,
      status: 'connecting',
    })
    useGameStore.getState().cancelRemove()

	    socketConnect(token)
  }, [authHydrated, mode, roomIdFromParams, socketConnect, token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== 'socket') return
    if (!authHydrated) return
    if (!token) return
    if (!roomIdFromParams) return
    if (!socketConnected) return
    if (joinedRoomRef.current === roomId) return

    socketJoinGame(roomId)
    joinedRoomRef.current = roomId
  }, [authHydrated, mode, roomId, roomIdFromParams, socketConnected, socketJoinGame, token])

  useEffect(() => {
    if (mode !== 'socket') return
    joinedRoomRef.current = null
  }, [mode, roomId])

  useLayoutEffect(() => {
    const u = useUserStore.getState().user
    const backend = useAuthStore.getState().user
    const myUserId = backend?._id || backend?.id || authUser?._id || authUser?.id || u?.id || null
    const myName = u?.displayName || u?.username || 'Player'
    const myHue = u?.avatarHue ?? 190
    const myAvatarId = u?.avatarId

    const existing = useGameStore.getState()
    const sameSession = existing.roomId === roomId && existing.mode === mode
    const boardReady = Array.isArray(existing.board) && existing.board.length === 9

    configure({
      roomId,
      mode,
      myUserId,
      players:
        mode === 'socket'
          ? {
              X: { name: 'Player X', avatarHue: 190, avatarId: 'cyber1' },
              O: { name: 'Player O', avatarHue: 285, avatarId: 'neon2' },
            }
          : {
              X: { name: myName, avatarHue: myHue, avatarId: myAvatarId },
              O:
                mode === 'ai'
                  ? { name: 'NeonBot', avatarHue: 285, avatarId: 'neon2' }
                  : mode === 'local'
                    ? { name: 'Player 2', avatarHue: 140, avatarId: 'ghost3' }
                    : { name: 'Opponent', avatarHue: 285, avatarId: 'ultra5' },
            },
    })

    if (mode === 'ai') {
      useGameStore.getState().configure({ myUserId, mySymbol: 'X' })
    }
    if (mode === 'socket') {
      if (!sameSession) {
        useGameStore.getState().applyServerState({
          players: [],
          board: Array.from({ length: 9 }, () => null),
          turn: 'X',
          winner: null,
          isDraw: false,
          winningLine: null,
          frozenPlayer: null,
          status: 'connecting',
        })
      }
      return
    }

    if (!sameSession || existing.status !== 'playing' || !boardReady) {
      startMatch({ resetScores: !sameSession })
    }
  }, [authUser?._id, authUser?.id, configure, mode, roomId, startMatch])

  useEffect(() => {
    if (!winner && !isDraw) return
    if (mode === 'ai' || mode === 'local') {
      const outcome =
        isDraw ? 'draw' : winner === 'X' ? 'win' : 'loss'

      recordMatchResult({ outcome })
      addMatch({
        outcome,
        mode,
        roomId,
        winner,
        username: user?.username,
        displayName: user?.displayName,
        players: { X: players.X.name, O: players.O.name },
        finalBoard: board,
      })
    }
  }, [
    addMatch,
    board,
    isDraw,
    mode,
    players.O.name,
    players.X.name,
    recordMatchResult,
    roomId,
    user?.displayName,
    user?.username,
    winner,
  ])

  useEffect(() => {
    if (mode !== 'ai') return
    if (status !== 'playing') return
    if (winner || isDraw) return
    if (turn !== 'O') return

    const result = pickAiMove(board, 'hard')
    if (!result) return

    const delay = result.delay || 300
    const t = setTimeout(() => {
      pressTile(result.move)
    }, delay)

    return () => clearTimeout(t)
  }, [board, isDraw, mode, pressTile, status, turn, winner])

  useEffect(() => {
    if (!winner) return
    playSound('win')
  }, [winner])

  useEffect(() => {
    if (needsOnlineLogin) {
      stopBackgroundMusic({ reset: true })
      return
    }

    if (soundMuted) {
      stopBackgroundMusic()
      return
    }

    if (winner || isDraw) {
      stopBackgroundMusic({ reset: true })
      return
    }

    startBackgroundMusic()
    return () => stopBackgroundMusic()
  }, [isDraw, needsOnlineLogin, soundMuted, winner])

	  useEffect(() => {
	    if (!winner) return
	    const show = setTimeout(() => setShowFireworks(true), 0)
	    const hide = setTimeout(() => setShowFireworks(false), 3000)
	    return () => {
	      clearTimeout(show)
	      clearTimeout(hide)
	    }
	  }, [winner])

	  useEffect(() => {
	    if (!winner && !isDraw) return
	    if (mode === 'socket' && serverPlayerCount < 2) return

    const reset = setTimeout(() => setRoundRestartLeft(ROUND_RESTART_SECONDS), 0)
    const interval = setInterval(() => {
      setRoundRestartLeft((t) => Math.max(0, t - 1))
    }, 1000)

    const restart = setTimeout(() => {
      dismissResultModal()
      if (mode === 'socket') {
        socketRequestRematch(roomId)
        return
      }
      startMatch()
    }, ROUND_RESTART_SECONDS * 1000)

    return () => {
      clearTimeout(reset)
      clearInterval(interval)
      clearTimeout(restart)
    }
  }, [
    dismissResultModal,
    isDraw,
    mode,
    roomId,
    serverPlayerCount,
    socketRequestRematch,
    startMatch,
    winner,
  ])

  useEffect(() => {
    if (mode !== 'socket') return

    const count = Array.isArray(serverPlayers) ? serverPlayers.length : 0
    const prev = prevPlayersCountRef.current
    prevPlayersCountRef.current = count

    if (prev >= 2 && count < 2) {
      const show = setTimeout(() => setOpponentNotice('Opponent left the match.'), 0)
      const hide = setTimeout(() => setOpponentNotice(''), 3500)
      return () => {
        clearTimeout(show)
        clearTimeout(hide)
      }
    }
  }, [mode, serverPlayers])

  const displayMode = mode === 'socket' ? 'online' : mode
  const inviteLink = useMemo(() => {
    if (mode !== 'socket') return ''
    return `${window.location.origin}/play/online/${roomId}`
  }, [mode, roomId])

  const fireworksSeed = useMemo(() => {
    if (!winner) return ''
    const boardKey = board.map((c) => c ?? '-').join('')
    return `${roomId}:${winner}:${boardKey}:${startingTurn}:${scores.X}-${scores.O}`
  }, [board, roomId, scores.O, scores.X, startingTurn, winner])

  const handleRematch = () => {
    navigator.vibrate?.(20)
    setShowFlash(true)
    dismissResultModal()
    if (mode === 'socket') {
      socketRequestRematch(roomId)
    }
    startMatch()
    setTimeout(() => setShowFlash(false), 400)
  }

  const handleToggleSound = () => {
    const next = !soundMuted
    setSoundMuted(next)
    setSoundMutedState(next)
    if (!next) {
      unlockSounds()
      if (!needsOnlineLogin && !winner && !isDraw) startBackgroundMusic()
    }
  }

  const handleExit = () => {
    stopAllSounds()
    if (mode === 'socket') socketDisconnect()
    navigate('/')
  }

  return (
    <>
      {showFireworks && winner ? (
        <div className="fixed inset-0 z-[70] pointer-events-none">
          <Fireworks seed={fireworksSeed} />
        </div>
      ) : null}

      {showFlash ? (
        <Motion.div
          className="fixed inset-0 z-[80] pointer-events-none"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        />
      ) : null}

	      <Motion.div
	        className="space-y-6"
	        initial={{ opacity: 0, y: 12 }}
	        animate={{ opacity: 1, y: 0 }}
	        exit={{ opacity: 0, y: -10 }}
	        transition={{ duration: 0.2 }}
	      >
	        {missingOnlineRoomId ? (
	          <div className="glass-panel p-6">
	            <div className="font-display text-xl font-bold text-zinc-100">Online match</div>
	            <div className="mt-2 text-sm text-zinc-300">
	              Missing game id. Start an online match from Home or paste a friend invite id.
	            </div>
	            <div className="mt-5 flex flex-wrap gap-2">
	              <button
	                type="button"
	                className="glass-button nav-active px-4 py-3 text-sm"
	                onClick={() => navigate('/')}
	              >
	                Back home
	              </button>
	            </div>
	          </div>
	        ) : authLoading ? (
          <div className="glass-panel p-6">
            <div className="font-display text-xl font-bold text-zinc-100">Online match</div>
            <div className="mt-2 text-sm text-zinc-300">Restoring your session…</div>
          </div>
        ) : needsOnlineLogin ? (
	          <div className="glass-panel p-6">
	            <div className="font-display text-xl font-bold text-zinc-100">Online match</div>
	            <div className="mt-2 text-sm text-zinc-300">
	              Login is required for online play.
            </div>
	            <div className="mt-5 flex flex-wrap gap-2">
	              <button
	                type="button"
	                className="glass-button nav-active px-4 py-3 text-sm"
	                onClick={() => navigate('/login', { state: { next: location.pathname } })}
	              >
	                Go to login
	              </button>
              <button
                type="button"
                className="glass-button px-4 py-3 text-sm"
                onClick={() => navigate('/')}
              >
                Back home
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-6">
		            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		              <div>
		                <div className="font-display text-xl font-bold text-zinc-100">Game</div>
		                <div className="mt-1 text-sm text-zinc-300">
		                  Room: <span className="font-mono text-zinc-100">{roomId}</span> • Mode:{' '}
		                  <span className="font-semibold text-zinc-100">{displayMode}</span>
		                  {mode === 'socket' ? (
		                    <>
		                      {' '}
		                      • Players:{' '}
		                      <span className="font-semibold text-zinc-100">{serverPlayerCount}/2</span> •
		                      Status:{' '}
		                      <span className="font-mono text-zinc-100">{status}</span>
		                    </>
		                  ) : null}
		                  {mode === 'socket' && mySymbol ? (
		                    <>
		                      {' '}
		                      • You:{' '}
		                      <span className="font-semibold text-zinc-100">{mySymbol}</span>
                    </>
                  ) : null}
                  {mode !== 'socket' ? (
                    <>
                      {' '}
                      • Starting:{' '}
                      <span className="font-semibold text-zinc-100">{startingTurn}</span>
                    </>
                  ) : null}
                  <span className="ml-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold tracking-[0.22em] text-zinc-100">
                    {displayMode.toUpperCase()} MODE
                  </span>
                </div>
              </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
		                {mode === 'socket' ? (
                      <>
  		                  <span
  		                    className={[
  		                      'inline-block size-2 rounded-full',
  		                      !socketConnected
  		                        ? 'bg-zinc-500'
  		                        : status !== 'playing'
  		                          ? 'bg-neon-purple shadow-neon-purple'
  		                          : 'bg-neon-cyan shadow-neon-cyan',
  		                    ].join(' ')}
  		                    aria-hidden="true"
  		                  />
  		                  <div className="text-xs text-zinc-300">
  		                    {!socketConnected
  		                      ? 'Connecting…'
  		                      : status !== 'playing'
  		                        ? 'Waiting for opponent…'
  		                        : 'Live'}
  		                  </div>
  		                  <button
  		                    type="button"
  		                    className="glass-button px-3 py-2 text-xs"
  	                    onClick={async () => {
  	                      await navigator.clipboard.writeText(inviteLink)
  	                    }}
  	                  >
  	                    Copy invite
  	                  </button>
                      </>
	                ) : null}

                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-100 shadow-glass transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                      onClick={handleToggleSound}
                      aria-label={soundMuted ? 'Unmute sound' : 'Mute sound'}
                    >
                      {soundMuted ? (
                        <svg viewBox="0 0 24 24" className="size-4" fill="none">
                          <path
                            d="M11 5 6 9H3v6h3l5 4V5Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          <path
                            d="m16 9 5 5m0-5-5 5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="size-4" fill="none">
                          <path
                            d="M11 5 6 9H3v6h3l5 4V5Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M15.5 8.5a5 5 0 0 1 0 7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M18.5 5.5a9 9 0 0 1 0 13"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            opacity="0.9"
                          />
                        </svg>
                      )}
                    </button>

                    <button
                      type="button"
                      className="glass-button px-3 py-2 text-xs"
                      onClick={handleExit}
                    >
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
                        <path
                          d="M10 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                          opacity="0.9"
                        />
                        <path
                          d="M15 12H3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="m6 9-3 3 3 3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Exit
                    </button>
                  </div>
	            </div>

	            {mode === 'socket' && socketLastError ? (
	              <div className="mt-4 rounded-2xl border border-neon-purple/30 bg-neon-purple/10 p-4 text-sm text-zinc-100">
	                Online error: {socketLastError}
	              </div>
	            ) : null}

            {opponentNotice ? (
              <div className="mt-4 rounded-2xl border border-neon-purple/30 bg-neon-purple/10 p-4 text-sm text-zinc-100">
                {opponentNotice}
              </div>
            ) : null}

	            {mode === 'socket' && socketConnected && status !== 'playing' ? (
	              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
	                Waiting for opponent… Share the invite link and this match will start automatically.
	              </div>
	            ) : null}

	            {mode === 'socket' && socketConnected && status !== 'playing' && onlyPlayerIsMe ? (
	              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
	                Tip: If you’re testing in two tabs, open the invite link in an incognito window or a
	                different browser and login with a second account (two tabs share the same token).
	              </div>
	            ) : null}

            {mode === 'socket' && waitingForRole ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
                Syncing player roles…
              </div>
            ) : null}

{winner || isDraw ? (
              <Motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-2xl border border-white/20 bg-black/80 px-5 py-3 shadow-xl backdrop-blur-xl"
              >
                <span className="text-sm font-medium text-zinc-200">
                  {roundRestartLeft > 0 ? `Next in ${roundRestartLeft}s` : 'New round…'}
                </span>
                <button
                  type="button"
                  onClick={handleRematch}
                  className="rounded-xl bg-neon-cyan px-4 py-2 text-sm font-bold text-black transition-all hover:scale-105 active:scale-95"
                >
                  Play Now
                </button>
              </Motion.div>
            ) : null}

            <div className="mt-6">
              <PlayerHUD
                players={players}
                turn={turn}
                scores={scores}
                myMark={mySymbol}
              />
            </div>

	            <div className="mt-6 flex justify-center">
                <div className="relative w-full max-w-md">
                  <GameBoard
                    board={board}
                    onMove={(index) => {
                      if (mode === 'socket') {
                        if (!socketConnected) return
                        if (!mySymbol) return
                        if (turn !== mySymbol) return
                        if (moveLocked) return

                        setMoveLocked(true)
                        socketSendMove({ gameId: roomId, index })
                        setTimeout(() => {
                          setMoveLocked(false)
                        }, 200)
                        return
                      }

                      if (boardDisabled) return

                      if (removeArmed) {
                        pressTile(index)
                        return
                      }

                      pressTile(index)
                    }}
                    disabled={boardDisabled}
                    winningLine={winningLine}
                    removeMode={mode === 'socket' ? false : removeArmed}
                    removeTarget={turn === 'X' ? 'O' : 'X'}
                  />

                  {winner || isDraw ? (
                    <button
                      type="button"
                      onClick={handleRematch}
                      disabled={mode === 'socket' && !socketConnected}
                      className="absolute top-1/2 -right-16 -translate-y-1/2 transform glass-button p-3 hover:scale-110 transition group rounded-xl"
                      aria-label="Rematch"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5 animate-spin-slow"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M21 12a9 9 0 1 1-3.513-7.117"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M21 3v6h-6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
	            </div>

            <div className="mt-6">
              <PowerUps
                counts={powerUps?.[turn]}
                removeArmed={mode === 'socket' ? false : removeArmed}
                freezeQueued={Boolean(frozenPlayer)}
                disabled={inputLocked || (mode === 'socket' && !socketConnected)}
                onFreeze={() => {
                  if (mode === 'socket') {
                    socketSendFreeze({ gameId: roomId })
                    return
                  }
                  activateFreeze()
                }}
                onRemove={() => {
                  if (mode === 'socket') {
                    return
                  }
                  if (removeArmed) {
                    cancelRemove()
                    return
                  }
                  armRemove()
                }}
              />
            </div>

            {inputLocked ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
                NeonBot is thinking…
              </div>
            ) : null}

            {frozenPlayer ? (
              <div className="mt-5 rounded-2xl border border-neon-cyan/20 bg-neon-cyan/10 p-4 text-sm text-zinc-100">
                Player <span className="font-bold">{frozenPlayer}</span> is frozen — their
                next turn will be skipped.
              </div>
            ) : null}
          </div>
        )}
      </Motion.div>

      <Modal
        open={needsOnlineLogin ? false : resultModalOpen}
        title={isDraw ? 'Draw' : winner ? `${winner} wins!` : 'Game'}
        onClose={() => dismissResultModal()}
        actions={
          <>
            <button
              type="button"
              className="glass-button"
              onClick={() => {
                dismissResultModal()
                navigate('/')
              }}
            >
              Back home
            </button>
            <button
              type="button"
              className="glass-button nav-active"
              onClick={() => {
                dismissResultModal()
                if (mode === 'socket') {
                  socketRequestRematch(roomId)
                  return
                }
                startMatch()
              }}
            >
              Rematch
            </button>
          </>
        }
      >
        <div className="space-y-2 text-zinc-200">
          <div>
            {isDraw
              ? 'No winner this time. Go again?'
              : winner
                ? `${winner} took the round.`
                : 'Match in progress.'}
          </div>
          <div className="text-xs text-zinc-400">
            Power-ups reset on rematch in MVP.
          </div>
        </div>
      </Modal>
    </>
  )
}
