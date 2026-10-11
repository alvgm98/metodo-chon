export const APP_NAME: string = import.meta.env.VITE_APP_NAME || 'Método Chon'

/** Días sin medir a partir de los cuales un cliente pasa a "Revisión pendiente". */
export const REVIEW_AFTER_DAYS = 30

export const GOALS = [
  'Pérdida de grasa',
  'Ganancia muscular',
  'Mantenimiento',
  'Salud digestiva',
  'Rendimiento deportivo',
] as const

export function portalUrl(token: string): string {
  return `${window.location.origin}/p/${token}`
}
