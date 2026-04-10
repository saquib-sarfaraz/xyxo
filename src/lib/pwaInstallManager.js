let deferredPrompt = null
let canInstall = false

export function initPWAInstall(setCanInstall) {
  if (isAppInstalled()) return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    canInstall = true
    setCanInstall(true)
  })

  window.addEventListener('appinstalled', () => {
    try {
      localStorage.setItem('appInstalled', 'true')
    } catch {
      // ignore
    }
    deferredPrompt = null
    canInstall = false
  })
}

export async function triggerInstall() {
  if (!deferredPrompt) return

  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  canInstall = false
  return choice
}

export function isAppInstalled() {
  try {
    if (localStorage.getItem('appInstalled') === 'true') return true
  } catch {
    // ignore
  }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true
  )
}

export function getInstallDismissed() {
  try {
    return localStorage.getItem('installDismissed') === 'true'
  } catch {
    return false
  }
}

export function setInstallDismissed() {
  try {
    localStorage.setItem('installDismissed', 'true')
  } catch {
    // ignore
  }
}

export function enableInstallBanner() {
  if (!deferredPrompt || canInstall) return false
  canInstall = true
  return true
}