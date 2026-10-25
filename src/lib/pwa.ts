// Utilidades de la PWA: registro del service worker, manifest por cliente e instalación.

export function registerServiceWorker(): void {
  // En desarrollo no: el servidor de Vite sirve los módulos sin hash y la caché molestaría.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sin service worker la app funciona igual */
    })
  })
}

/** ¿Se está ejecutando ya como app instalada? */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

/**
 * En el portal de un cliente apunta el <link rel="manifest"> a uno propio
 * (función /api/manifest) cuyo start_url es su portal. Devuelve cómo deshacerlo.
 */
export function applyPortalManifest(token: string): () => void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
  if (!link || !import.meta.env.PROD) return () => {}
  const prevHref = link.getAttribute('href')
  const prevTitle = appleTitle?.content
  link.setAttribute('href', `/api/manifest?t=${encodeURIComponent(token)}`)
  if (appleTitle) appleTitle.content = 'Mi progreso'
  return () => {
    if (prevHref) link.setAttribute('href', prevHref)
    if (appleTitle && prevTitle) appleTitle.content = prevTitle
  }
}

// --- Evento de instalación (Chrome/Edge/Android) ------------------------------

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<(e: BeforeInstallPromptEvent | null) => void>()

// Se captura cuanto antes: el navegador lo lanza una sola vez, al cargar.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l(deferred))
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l(null))
  })
}

export function onInstallPrompt(cb: (e: BeforeInstallPromptEvent | null) => void): () => void {
  listeners.add(cb)
  cb(deferred)
  return () => listeners.delete(cb)
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  listeners.forEach((l) => l(null))
  return outcome === 'accepted'
}
