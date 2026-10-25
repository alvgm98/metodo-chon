// Carga diferida de páginas resistente a despliegues nuevos.
// Cada versión publicada renombra sus ficheros JS. Si alguien tiene abierta una
// versión anterior y navega a una página que aún no había cargado, ese fichero ya
// no existe. En ese caso recargamos (una sola vez) para obtener la versión nueva.
import { lazy, type ComponentType } from 'react'

const RELOAD_KEY = 'chunk-reload-at'

export function isChunkLoadError(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    message,
  )
}

/** Recarga la página salvo que ya se haya intentado hace muy poco (evita bucles). */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < 15_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    /* sin almacenamiento: recargamos igualmente */
  }
  window.location.reload()
  return true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((error) => {
      // Mientras se recarga, dejamos la carga "pendiente" para no mostrar un error.
      if (isChunkLoadError(error) && reloadForNewVersion()) return new Promise<never>(() => {})
      throw error
    }),
  )
}
