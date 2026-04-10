import { motion as Motion } from 'framer-motion'
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { useAppStore } from '../store/useAppStore'

export default function Layout() {
  const purgeExpiredMatches = useAppStore((s) => s.purgeExpiredMatches)

  useEffect(() => {
    purgeExpiredMatches()
  }, [purgeExpiredMatches])

  return (
    <div className="min-h-screen bg-app-bg bg-neon-radial">
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 pb-28 pt-6 lg:px-6 lg:pb-6">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Navbar />

          <Motion.main
            className="min-w-0 flex-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Outlet />
          </Motion.main>
        </div>
      </div>
    </div>
  )
}

