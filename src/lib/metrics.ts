import { REVIEW_AFTER_DAYS } from '@/config'
import { daysBetween, parseDate, toIsoDate, todayIso } from './format'
import type { Measurement, MetricKey, Sex } from './types'

export interface MetricDef {
  key: MetricKey
  label: string
  unit: 'kg' | 'cm'
}

export const METRICS: MetricDef[] = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg' },
  { key: 'neck_cm', label: 'Cuello', unit: 'cm' },
  { key: 'waist_cm', label: 'Cintura estrecha', unit: 'cm' },
  { key: 'navel_cm', label: 'Zona ombligo', unit: 'cm' },
  { key: 'hip_cm', label: 'Cadera', unit: 'cm' },
]

export const PERIMETERS = METRICS.filter((m) => m.unit === 'cm')

export function metricDef(key: MetricKey): MetricDef {
  return METRICS.find((m) => m.key === key)!
}

export interface Point {
  date: string // YYYY-MM-DD
  value: number
}

export function sortMeasurements<T extends Pick<Measurement, 'measured_on'>>(ms: T[]): T[] {
  return [...ms].sort((a, b) => a.measured_on.localeCompare(b.measured_on))
}

/** Serie ordenada por fecha de una métrica, ignorando huecos. */
export function series(ms: Measurement[], key: MetricKey): Point[] {
  return sortMeasurements(ms)
    .filter((m) => m[key] != null)
    .map((m) => ({ date: m.measured_on, value: Number(m[key]) }))
}

export interface Summary {
  first: Point
  last: Point
  /** penúltimo valor, para "vs. anterior" */
  previous: Point | null
  delta: number
  pct: number
}

export function summarize(points: Point[]): Summary | null {
  if (points.length === 0) return null
  const first = points[0]
  const last = points[points.length - 1]
  const previous = points.length > 1 ? points[points.length - 2] : null
  const delta = round1(last.value - first.value)
  return { first, last, previous, delta, pct: first.value ? (delta / first.value) * 100 : 0 }
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// --- Rangos temporales --------------------------------------------------------

export type RangeKey = '3m' | '6m' | 'all'

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
  { key: 'all', label: 'Todo' },
]

/** Recorta la serie a los últimos N meses contados desde la última medición. */
export function filterRange(points: Point[], range: RangeKey): Point[] {
  if (range === 'all' || points.length === 0) return points
  const last = parseDate(points[points.length - 1].date)
  const from = new Date(last.getFullYear(), last.getMonth() - (range === '3m' ? 3 : 6), last.getDate())
  const fromIso = toIsoDate(from)
  return points.filter((p) => p.date >= fromIso)
}

// --- Indicadores --------------------------------------------------------------

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return weightKg / (m * m)
}

export function bmiSeries(ms: Measurement[], heightCm: number | null): Point[] {
  if (!heightCm) return []
  return series(ms, 'weight_kg').map((p) => ({ date: p.date, value: round1(bmi(p.value, heightCm)) }))
}

/** Índice cintura-cadera: cintura estrecha / cadera (solo mediciones con ambos datos). */
export function whrSeries(ms: Measurement[]): Point[] {
  return sortMeasurements(ms)
    .filter((m) => m.waist_cm != null && m.hip_cm != null && Number(m.hip_cm) > 0)
    .map((m) => ({
      date: m.measured_on,
      value: Math.round((Number(m.waist_cm) / Number(m.hip_cm)) * 100) / 100,
    }))
}

/** OMS: riesgo cardiometabólico aumentado a partir de estos valores de ICC. */
export const WHR_RISK: Record<Sex, number> = { female: 0.85, male: 0.9 }

export interface Band {
  from: number
  to: number
  label: string
  tone: 'low' | 'ok' | 'warn' | 'risk'
}

export const BMI_BANDS: Band[] = [
  { from: 0, to: 18.5, label: 'Bajo peso', tone: 'low' },
  { from: 18.5, to: 25, label: 'Normopeso', tone: 'ok' },
  { from: 25, to: 30, label: 'Sobrepeso', tone: 'warn' },
  { from: 30, to: 100, label: 'Obesidad', tone: 'risk' },
]

export function whrBands(sex: Sex): Band[] {
  return [
    { from: 0, to: WHR_RISK[sex], label: 'Riesgo bajo', tone: 'ok' },
    { from: WHR_RISK[sex], to: 5, label: 'Riesgo aumentado', tone: 'risk' },
  ]
}

export function bmiCategory(value: number): Band {
  return BMI_BANDS.find((b) => value >= b.from && value < b.to) ?? BMI_BANDS[BMI_BANDS.length - 1]
}

// --- Estado de revisión ------------------------------------------------------

export type ReviewStatus = 'ok' | 'pending' | 'empty'

export function reviewStatus(lastMeasuredOn: string | null, today = todayIso()): ReviewStatus {
  if (!lastMeasuredOn) return 'empty'
  return daysBetween(lastMeasuredOn, today) > REVIEW_AFTER_DAYS ? 'pending' : 'ok'
}

export function weeksBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round(daysBetween(fromIso, toIso) / 7))
}
