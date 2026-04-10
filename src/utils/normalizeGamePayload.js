export function normalizeGamePayload(payload) {
  const game = payload?.game && typeof payload.game === 'object' ? payload.game : payload
  if (!game || typeof game !== 'object') return null

  const players = game.players ?? payload?.players

  const board = Array.isArray(game.board) ? game.board : payload?.board
  const boardEmpty =
    Array.isArray(board) &&
    board.length === 9 &&
    board.every((cell) => cell === null || cell === '' || cell === undefined)

  const winner =
    typeof game.winner === 'string'
      ? game.winner
      : typeof game.winner?.player === 'string'
        ? game.winner.player
        : payload?.winner ?? null

  const winningLine =
    Array.isArray(game.winningLine)
      ? game.winningLine
      : Array.isArray(game.winner?.pattern)
        ? game.winner.pattern
        : payload?.winningLine ?? null

  const turn = game.turn ?? game.currentTurn ?? payload?.turn
  const startingTurn = game.startingTurn ?? payload?.startingTurn
  const isDraw = game.isDraw ?? game.draw ?? payload?.isDraw
  const explicitStatus = game.status ?? payload?.status

  // Some backends reset board/winner but keep `status: finished`. Treat an empty board as a new round.
  const normalizedWinner = boardEmpty && (winner === '' || winner === undefined) ? null : winner
  const normalizedIsDraw = boardEmpty && (isDraw === undefined || isDraw === null) ? false : isDraw
  const normalizedWinningLine = boardEmpty ? null : winningLine

  let status = explicitStatus
  if (!status) {
    if (Array.isArray(players)) {
      status = players.length >= 2 ? 'playing' : 'waiting'
    }
  }

  // If we already have two players, treat the game as live even if the backend
  // forgets to flip `status` from waiting -> playing.
  if (Array.isArray(players) && players.length >= 2 && status && status !== 'playing' && status !== 'finished') {
    status = 'playing'
  }

  if (boardEmpty && Array.isArray(players)) {
    status = players.length >= 2 ? 'playing' : 'waiting'
  }

  if (!status && (winner || isDraw)) status = 'finished'

  return {
    board,
    turn,
    startingTurn,
    players,
    winner: normalizedWinner,
    isDraw: normalizedIsDraw,
    winningLine: normalizedWinningLine,
    powerUps: game.powerUps ?? payload?.powerUps,
    frozenPlayer: game.frozenPlayer ?? payload?.frozenPlayer,
    status,
  }
}
