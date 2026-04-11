let deferredPrompt = null
let listenersInitialized = false

export function initPWAInstall(setCanInstall) {
  if (isAppInstalled()) {
    console.log('[PWA] Already installed')
    return
  }

  if (listenersInitialized) {
    console.log('[PWA] Listeners already initialized')
    return
  }
  listenersInitialized = true

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    console.log('[PWA] Install prompt available')
    setCanInstall(true)
  })

  window.addEventListener('appinstalled', () => {
    try {
      localStorage.setItem('pwaInstalled', 'true')
    } catch {
      // ignore
    }
    deferredPrompt = null
    console.log('[PWA] Installed!')
  })
}

export async function triggerInstall() {
  if (!deferredPrompt) {
    console.log('[PWA] No prompt available')
    return
  }

  const choice = await deferredPrompt.userChoice
  console.log('[PWA] User choice:', choice.outcome)
  deferredPrompt = null
  return choice
}

export function isAppInstalled() {
  // Check display mode
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  if (window.navigator?.standalone === true) return true
  
  // Check localStorage
  try {
    if (localStorage.getItem('pwaInstalled') === 'true') return true
  } catch {
    // ignore
  }
  return false
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