import { useEffect, useState } from 'react'
import { triggerInstall } from '../lib/pwaInstallManager'

export default function PWAInstallBanner({ visible, onDismiss }) {
  const [show, setShow] = useState(false)
  const [failed, setFailed] = useState(false)
  const isInstalled = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator?.standalone === true)

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(timer)
  }, [visible])

  if (!show || isInstalled) return null

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

  const handleInstall = async () => {
    const result = await triggerInstall()
    if (result?.outcome === 'accepted') {
      onDismiss()
      setShow(false)
    } else if (result?.outcome === 'dismissed') {
      setFailed(true)
      setTimeout(() => setShow(false), 2000)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md">
      <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_25px_rgba(34,211,238,0.15)]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-white font-bold text-sm">
          �𝕏
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">Install Xyxo</div>
          <div className="text-xs text-zinc-400 truncate">
            {failed 
              ? 'Tap Share → Add to Home' 
              : isIOS 
                ? 'Tap Share → Add to Home' 
                : 'Faster access, real-time play'}
          </div>
        </div>
        {isIOS || failed ? (
          <button
            type="button"
            onClick={() => {
              onDismiss()
              setShow(false)
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 text-zinc-300 shrink-0"
          >
            {failed ? 'OK' : 'Got it'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleInstall}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-neon-cyan to-neon-purple text-black shrink-0"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onDismiss()
            setShow(false)
          }}
          className="text-zinc-400 hover:text-white text-sm shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  )
}