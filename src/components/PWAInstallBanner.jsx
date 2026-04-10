import { triggerInstall } from '../lib/pwaInstallManager'

export default function PWAInstallBanner({ visible, onDismiss }) {
  if (!visible) return null

  const handleInstall = async () => {
    const result = await triggerInstall()
    if (result?.outcome === 'accepted') {
      onDismiss()
    }
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div className="glass-panel flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg">
        <span className="text-sm text-zinc-200">
          Install app for faster gameplay
        </span>
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-black"
        >
          Install
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-2 text-xs text-zinc-400"
        >
          ✕
        </button>
      </div>
    </div>
  )
}