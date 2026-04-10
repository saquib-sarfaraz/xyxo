import { useEffect, useState } from 'react'
import { initPWAInstall, isAppInstalled, getInstallDismissed, setInstallDismissed } from '../lib/pwaInstallManager'

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    if (isAppInstalled()) return

    if (getInstallDismissed()) return

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