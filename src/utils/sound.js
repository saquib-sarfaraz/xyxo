let cachedSounds = null
let cachedMusic = null
const DEFAULT_VOLUME = 0.5
const MUSIC_VOLUME = 0.6
const MUTE_KEY = 'ttpro:muted'
let muted = false

try {
  if (typeof window !== 'undefined') {
    muted = window.localStorage.getItem(MUTE_KEY) === '1'
  }
} catch {
  muted = false
}

function applyMuteToAudio(audio, volume) {
  if (!audio) return
  audio.muted = muted
  audio.volume = muted ? 0 : volume
}

function applyMute(sounds) {
  if (!sounds) return
  Object.values(sounds).forEach((sound) => applyMuteToAudio(sound, DEFAULT_VOLUME))
}

function createAudio(primarySrc, fallbackSrc) {
  const audio = new Audio(primarySrc)
  audio.preload = 'auto'

  if (fallbackSrc) {
    let swapped = false
    audio.addEventListener('error', () => {
      if (swapped) return
      swapped = true
      try {
        audio.src = fallbackSrc
        audio.load()
      } catch {
        // ignore
      }
    })
  }

  return audio
}

function initSounds() {
  if (cachedSounds) return cachedSounds
  if (typeof Audio === 'undefined') return null

  const sounds = {
    // Support both common spellings: tick.mp3 (preferred) and tic.mp3 (fallback).
    tick: createAudio('/sounds/tick.mp3', '/sounds/tic.mp3'),
    win: createAudio('/sounds/win.mp3'),
  }

  cachedSounds = sounds
  applyMute(cachedSounds)
  return cachedSounds
}

function initMusic() {
  if (cachedMusic) return cachedMusic
  if (typeof Audio === 'undefined') return null

  const music = createAudio('/sounds/music.mp3')
  music.loop = true

  cachedMusic = music
  applyMuteToAudio(cachedMusic, MUSIC_VOLUME)
  return cachedMusic
}

export function playSound(name) {
  if (muted) return
  const sounds = initSounds()
  if (!sounds) return

  const sound = sounds[name]
  if (!sound) return

  try {
    sound.pause()
    sound.currentTime = 0
    const promise = sound.play()
    if (promise && typeof promise.catch === 'function') promise.catch(() => {})
  } catch {
    // ignore
  }
}

export function stopAllSounds() {
  const sounds = initSounds()
  if (sounds) {
    Object.values(sounds).forEach((sound) => {
      try {
        sound.pause()
        sound.currentTime = 0
      } catch {
        // ignore
      }
    })
  }

  if (cachedMusic) {
    try {
      cachedMusic.pause()
      cachedMusic.currentTime = 0
    } catch {
      // ignore
    }
  }
}

export function isSoundMuted() {
  return muted
}

export function setSoundMuted(next) {
  muted = Boolean(next)
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    }
  } catch {
    // ignore
  }

  if (cachedSounds) applyMute(cachedSounds)
  if (cachedMusic) applyMuteToAudio(cachedMusic, MUSIC_VOLUME)
  if (muted) stopAllSounds()

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ttpro:mutechange', { detail: { muted } }))
    }
  } catch {
    // ignore
  }

  return muted
}

export function toggleSoundMuted() {
  return setSoundMuted(!muted)
}

export function unlockSounds() {
  const sounds = initSounds()
  const music = initMusic()
  if (!sounds && !music) return

  if (muted) {
    if (sounds) applyMute(sounds)
    if (music) applyMuteToAudio(music, MUSIC_VOLUME)
    return
  }

  const warm = (sound, onDone) => {
    try {
      // Some browsers are pickier about "muted" unlock attempts; use near-silent volume
      // but keep the element unmuted for the gesture-initiated warmup.
      sound.muted = false
      sound.volume = 0.001
      sound.currentTime = 0

      const promise = sound.play()
      if (promise && typeof promise.then === 'function') {
        promise
          .then(() => {
            sound.pause()
            sound.currentTime = 0
            onDone?.()
          })
          .catch(() => {})
        return
      }

      sound.pause()
      sound.currentTime = 0
      onDone?.()
    } catch {
      // ignore
    }
  }

  if (sounds) {
    Object.values(sounds).forEach((sound) => warm(sound, () => applyMute(sounds)))
    applyMute(sounds)
  }

  if (music) {
    warm(music, () => applyMuteToAudio(music, MUSIC_VOLUME))
    applyMuteToAudio(music, MUSIC_VOLUME)
  }
}

export function startBackgroundMusic({ restart } = {}) {
  if (muted) return
  const music = initMusic()
  if (!music) return

  try {
    music.loop = true
    applyMuteToAudio(music, MUSIC_VOLUME)
    if (restart) music.currentTime = 0

    const promise = music.play()
    if (promise && typeof promise.catch === 'function') promise.catch(() => {})
  } catch {
    // ignore
  }
}

export function stopBackgroundMusic({ reset } = {}) {
  const music = initMusic()
  if (!music) return

  try {
    music.pause()
    if (reset) music.currentTime = 0
  } catch {
    // ignore
  }
}
