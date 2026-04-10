import { useEffect, useState, useCallback } from 'react'
import { initPWAInstall, isAppInstalled, getInstallDismissed, setInstallDismissed, enableInstallBanner } from '../lib/pwaInstallManager'

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)

  const handleInteraction = useCallback(() => {
    if (enableInstallBanner()) {
      setCanInstall(true)
    }
  }, [])

  useEffect(() => {
    if (isAppInstalled()) return
    if (getInstallDismissed()) return

    initPWAInstall(setCanInstall)

    window.addEventListener('click', handleInteraction, { once: true })
    window.addEventListener('scroll', handleInteraction, { once: true })

    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('scroll', handleInteraction)
    }
  }, [handleInteraction])

  return {
    canInstall,
    dismiss: () => {
      setInstallDismissed()
      setCanInstall(false)
    },
  }
}