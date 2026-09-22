/** Alertas do descanso: som (Web Audio), vibração e Wake Lock. */

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      audioCtx = new Ctor()
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Precisa ser chamado dentro de um gesto do usuário (ex.: tocar em "iniciar
 * descanso") para desbloquear o áudio no iOS. Depois o beep toca sozinho.
 */
export function unlockAudio() {
  const ctx = getCtx()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

/** Três bipes curtos. */
export function playBeep() {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    const t = now + i * 0.28
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.22)
  }
}

export function vibrate() {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {}
}

let wakeLock: WakeLockSentinel | null = null

export async function acquireWakeLock() {
  try {
    if (!('wakeLock' in navigator) || wakeLock) return
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => {
      wakeLock = null
    })
  } catch {}
}

export function releaseWakeLock() {
  try {
    void wakeLock?.release()
  } catch {}
  wakeLock = null
}
