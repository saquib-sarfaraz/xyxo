import { useEffect, useMemo, useState } from 'react'
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinRoom,
  requestRematch,
  sendMove,
} from '../services/socketService'
import { useGameStore } from '../store/useGameStore'

export function useSocket(roomId) {
  const [connected, setConnected] = useState(false)
  const applyServerState = useGameStore((s) => s.applyServerState)
  const startMatch = useGameStore((s) => s.startMatch)

  useEffect(() => {
    if (!roomId) return
    const s = connectSocket()

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)

    s.on('connect', handleConnect)
    s.on('disconnect', handleDisconnect)

    return () => {
      disconnectSocket()
      s.off('connect', handleConnect)
      s.off('disconnect', handleDisconnect)
    }
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    const s = getSocket()
    if (!s) return

    const onUpdateBoard = (payload) => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          applyServerState(payload)
        }, 30)
      })
    }
    const onGameOver = (payload) => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          applyServerState({ ...payload, status: 'finished' })
        }, 30)
      })
    }
    const onRematch = () => startMatch()

    s.on('update_board', onUpdateBoard)
    s.on('game_over', onGameOver)
    s.on('rematch', onRematch)

    return () => {
      s.off('update_board', onUpdateBoard)
      s.off('game_over', onGameOver)
      s.off('rematch', onRematch)
    }
  }, [applyServerState, roomId, startMatch])

  useEffect(() => {
    if (!roomId) return
    joinRoom(roomId)
  }, [roomId, connected])

  const api = useMemo(
    () => ({
      connected: roomId ? connected : false,
      sendMove: (index) => {
        if (!roomId) return
        sendMove(index)
      },
      rematch: () => {
        if (!roomId) return
        requestRematch()
      },
    }),
    [connected, roomId],
  )

  return api
}
