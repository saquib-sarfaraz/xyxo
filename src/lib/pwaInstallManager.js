let deferredPrompt = null

export function initPWAInstall(setCanInstall) {
  if (isAppInstalled()) return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e

    setTimeout(() => {
      setCanInstall(true)
    }, 5000)
  })
}

export async function triggerInstall() {
  if (!deferredPrompt) return

  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  return choice
}

export function isAppInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true
  )
}

export function getInstallDismissed() {
  try {
    return sessionStorage.getItem('installDismissed') === 'true'
  } catch {
    return false
  }
}

export function setInstallDismissed() {
  try {
    sessionStorage.setItem('installDismissed', 'true')
  } catch {
    // ignore
  }
}