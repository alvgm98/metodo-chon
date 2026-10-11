const MINUS = '−'

const nf1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateLong = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const dateShort = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const monthShort = new Intl.DateTimeFormat('es-ES', { month: 'short' })

/** Convierte 'YYYY-MM-DD' en Date local (sin desfase de zona horaria). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

const clean = (s: string) => s.replace(/\./g, '')

/** 5 oct 2026 */
export function fmtDate(iso: string | Date): string {
  return clean(dateLong.format(typeof iso === 'string' ? parseDate(iso) : iso))
}

/** 5 oct */
export function fmtDateShort(iso: string | Date): string {
  return clean(dateShort.format(typeof iso === 'string' ? parseDate(iso) : iso))
}

export function fmtMonth(date: Date): string {
  return clean(monthShort.format(date))
}

/** "2 mar – 5 oct 2026" o "2 mar 2025 – 5 oct 2026" */
export function fmtDateRange(from: string, to: string): string {
  if (from.slice(0, 4) === to.slice(0, 4)) return `${fmtDateShort(from)} – ${fmtDate(to)}`
  return `${fmtDate(from)} – ${fmtDate(to)}`
}

export function fmtNum(value: number | null | undefined, decimals: 1 | 2 = 1): string {
  if (value == null || Number.isNaN(value)) return '—'
  const s = (decimals === 2 ? nf2 : nf1).format(Math.abs(value))
  return value < 0 ? MINUS + s : s
}

/** Con signo explícito: +2,1 / −8,6 / 0,0 */
export function fmtDelta(value: number | null | undefined, decimals: 1 | 2 = 1): string {
  if (value == null || Number.isNaN(value)) return '—'
  const rounded = Number(value.toFixed(decimals))
  if (rounded === 0) return (decimals === 2 ? nf2 : nf1).format(0)
  return (rounded > 0 ? '+' : MINUS) + (decimals === 2 ? nf2 : nf1).format(Math.abs(rounded))
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${fmtDelta(value)} %`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDate(toIso).getTime() - parseDate(fromIso).getTime()) / 86_400_000)
}

export function ageFrom(birthIso: string | null, todayIsoDate = todayIso()): number | null {
  if (!birthIso) return null
  const b = parseDate(birthIso)
  const t = parseDate(todayIsoDate)
  let age = t.getFullYear() - b.getFullYear()
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--
  return age
}

/** Altura en metros con coma: 1,65 m */
export function fmtHeight(cm: number | null): string | null {
  if (cm == null) return null
  return `${nf2.format(cm / 100)} m`
}
