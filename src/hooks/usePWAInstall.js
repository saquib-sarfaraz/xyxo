import { useEffect, useState } from 'react'
import { initPWAInstall, isAppInstalled, getInstallDismissed, setInstallDismissed } from '../lib/pwaInstallManager'

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    if (isAppInstalled()) {
      console.log('[PWA] Already installed, skipping')
      return
    }
    
    if (getInstallDismissed()) {
      console.log('[PWA] User dismissed previously, skipping')
      return
    }

    console.log('[PWA] Initializing install detection...')
    initPWAInstall(setCanInstall)
  }, [])

  return {
    canInstall,
    dismiss: () => {
      setInstallDismissed()
      setCanInstall(false)
    },
  }
}