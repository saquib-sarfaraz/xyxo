import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import Layout from './layout/Layout'
import Friends from './pages/Friends'
import Game from './pages/Game'
import Home from './pages/Home'
import Leaderboard from './pages/Leaderboard'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Stats from './pages/Stats'
import PWAInstallBanner from './components/PWAInstallBanner'
import { usePWAInstall } from './hooks/usePWAInstall'
import { useAuthStore } from './store/useAuthStore'
import { useSocketStore } from './store/useSocketStore'
import { unlockSounds } from './utils/sound'

function LegacyGameRedirect() {
  const { roomId } = useParams()
  return <Navigate to={`/play/online/${roomId}`} replace />
}

export default function App() {
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const authHydrated = useAuthStore((s) => s.hydrated)
  const socketConnect = useSocketStore((s) => s.connect)
  const { canInstall, dismiss } = usePWAInstall()

  useEffect(() => {
    if (typeof window === 'undefined') return

    let unlocked = false
    const unlock = () => {
      if (unlocked) return
      unlocked = true
      unlockSounds()
    }

    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!authHydrated) return
    if (!token) return
    socketConnect(token)
  }, [authHydrated, socketConnect, token])

  return (
    <>
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/play/:mode" element={<Game />} />
          <Route path="/play/:mode/:roomId" element={<Game />} />
          <Route path="/game/:roomId" element={<LegacyGameRedirect />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
      <PWAInstallBanner visible={canInstall} onDismiss={dismiss} />
    </>
  )
}
