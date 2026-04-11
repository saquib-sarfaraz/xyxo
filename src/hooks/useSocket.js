import { useEffect, useMemo, useState } from 'react'
import {
  connectSocket,
  getSocket,
  joinRoom,
  requestRematch,
  sendMove,
  sendFreeze,
  sendRemove,
} from '../services/socketService'
import { useGameStore } from '../store/useGameStore'

export function useSocket(roomId) {
  const [connected, setConnected] = useState(false)
  const applyServerState = useGameStore((s) => s.applyServerState)
  const startMatch = useGameStore((s) => s.startMatch)

  useEffect(() => {
    if (!roomId) return
    const s = connectSocket()

    const handleConnect = () => {
      setConnected(true)
      joinRoom(roomId)
    }
    const handleDisconnect = () => setConnected(false)

    s.on('connect', handleConnect)
    s.on('disconnect', handleDisconnect)

    return () => {
      s.off('connect', handleConnect)
      s.off('disconnect', handleDisconnect)
    }
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    const s = getSocket()
    if (!s) return

    const onGameUpdate = (payload) => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          applyServerState(payload)
        }, 30)
      })
    }
    const onRematch = (data) => {
      if (data?.reset) {
        setTimeout(() => {
          startMatch()
        }, 400)
      }
    }
    const onRematchRequest = () => {
      useGameStore.getState().setRematchRequest(true)
    }

    s.on('game:update', onGameUpdate)
    s.on('game:rematch', onRematch)
    s.on('game:rematch-request', onRematchRequest)

    return () => {
      s.off('game:update', onGameUpdate)
      s.off('game:rematch', onRematch)
      s.off('game:rematch-request', onRematchRequest)
    }
  }, [applyServerState, roomId, startMatch])

  const api = useMemo(
    () => ({
      connected: roomId ? connected : false,
      sendMove: (index) => {
        if (!roomId) return
        sendMove(index)
      },
      sendFreeze: () => {
        if (!roomId) return
        sendFreeze()
      },
      sendRemove: (index) => {
        if (!roomId) return
        sendRemove(index)
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
