// Silueta orientativa (viewBox 0 0 200 430) para comparar "antes" y "ahora".
//
// Dos capas, a propósito:
// 1. La FIGURA es siempre un cuerpo humano bien proporcionado (base por sexo). Las
//    medidas solo la ajustan con suavidad, para que nunca resulte una caricatura.
// 2. La DIFERENCIA entre inicio y ahora se dibuja a escala real del cambio en cm,
//    que es lo que el cliente necesita ver.
import type { MetricKey, Sex } from './types'

type Pt = [number, number]

export const BODY_W = 200
export const BODY_H = 436
const CX = BODY_W / 2

export type PerimeterKey = Extract<MetricKey, 'neck_cm' | 'waist_cm' | 'navel_cm' | 'hip_cm'>
export type Perimeters = Record<PerimeterKey, number>

/** Altura (y) a la que se mide cada perímetro. */
export const LEVEL_Y: Record<PerimeterKey, number> = {
  neck_cm: 68,
  waist_cm: 151,
  navel_cm: 171,
  hip_cm: 193,
}

/** Perímetros de referencia: con estos valores se dibuja exactamente la figura base. */
const REFERENCE: Record<Sex, Perimeters> = {
  female: { neck_cm: 33, waist_cm: 72, navel_cm: 84, hip_cm: 98 },
  male: { neck_cm: 38, waist_cm: 84, navel_cm: 90, hip_cm: 100 },
}

/** Completa los perímetros que falten con valores de referencia. */
export function perimetersFrom(sex: Sex, values: Partial<Record<PerimeterKey, number | null>>): Perimeters {
  const d = REFERENCE[sex]
  return {
    neck_cm: values.neck_cm ?? d.neck_cm,
    waist_cm: values.waist_cm ?? d.waist_cm,
    navel_cm: values.navel_cm ?? d.navel_cm,
    hip_cm: values.hip_cm ?? d.hip_cm,
  }
}

/** Semianchos (px) de la figura en cada zona. */
export interface Widths {
  neck: number
  shoulder: number
  chest: number
  waist: number
  navel: number
  hip: number
}

/** Figura base, proporcionada, por sexo (semianchos sobre un lienzo de 200 px). */
const BASE: Record<Sex, Widths> = {
  female: { neck: 9.7, shoulder: 52, chest: 36.5, waist: 31, navel: 34, hip: 40 },
  male: { neck: 11.5, shoulder: 58, chest: 41, waist: 36, navel: 37, hip: 39 },
}

/** Cuánto se deja influir la figura por las medidas (0 = siempre igual, 1 = a escala). */
const INFLUENCE = 0.35
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const ratio = (value: number, reference: number) => clamp(1 + INFLUENCE * (value / reference - 1), 0.88, 1.16)

/** Figura para unas medidas: la base ajustada con suavidad. */
export function figureWidths(sex: Sex, p: Perimeters): Widths {
  const b = BASE[sex]
  const r = REFERENCE[sex]
  const waist = ratio(p.waist_cm, r.waist_cm)
  const navel = ratio(p.navel_cm, r.navel_cm)
  const hip = ratio(p.hip_cm, r.hip_cm)
  const body = (waist + navel + hip) / 3
  return {
    neck: b.neck * ratio(p.neck_cm, r.neck_cm),
    shoulder: b.shoulder * (1 + (body - 1) * 0.4),
    chest: b.chest * (1 + (body - 1) * 0.7),
    waist: b.waist * waist,
    navel: b.navel * navel,
    hip: b.hip * hip,
  }
}

/**
 * Semiancho real por cm de perímetro: el perímetro / π da el diámetro, el tronco es
 * ≈1,1 veces más ancho que profundo y 1 cm de anchura ≈ 3,2 px → 0,56 px por cm.
 */
const PX_PER_CM = 0.56

/**
 * Figura del "inicio": la de ahora más la diferencia de cada perímetro a escala real
 * (sin ampliar).
 */
export function widthsWithChange(sex: Sex, last: Perimeters, first: Perimeters): Widths {
  const w = figureWidths(sex, last)
  const d = (k: PerimeterKey) => (first[k] - last[k]) * PX_PER_CM
  const trunk = (d('waist_cm') + d('navel_cm')) / 2
  return {
    neck: Math.max(5, w.neck + d('neck_cm') * 0.55),
    shoulder: Math.max(20, w.shoulder + trunk * 0.15),
    chest: Math.max(15, w.chest + trunk * 0.5),
    waist: Math.max(12, w.waist + d('waist_cm')),
    navel: Math.max(12, w.navel + d('navel_cm')),
    hip: Math.max(15, w.hip + d('hip_cm')),
  }
}

/** Curva cerrada suave (Catmull-Rom → Bézier) a través de los puntos. */
function smoothClosed(pts: Pt[]): string {
  const n = pts.length
  const p = (i: number) => pts[(i + n) % n]
  let d = `M${f(p(0)[0])},${f(p(0)[1])}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)]
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`
  }
  return d + ' Z'
}

const f = (n: number) => Math.round(n * 10) / 10

export interface BodyShape {
  /** contorno completo: tronco, brazos y piernas en un solo trazo */
  path: string
  head: { cx: number; cy: number; rx: number; ry: number }
  /** semiancho del cuerpo en cada nivel de medida */
  widths: Record<PerimeterKey, number>
}

/** Referencia para colgar el brazo: lo más ancho del tronco a su altura. */
export function armBase(w: Widths): number {
  return Math.max(w.chest, w.navel, w.hip - 3)
}

/**
 * Brazo de la figura de inicio: se separa solo una parte de lo que cambia el tronco,
 * para que la diferencia se vea en el tronco y no parezca que adelgazan los brazos.
 */
export function beforeArmBase(after: Widths, before: Widths): number {
  return armBase(after) + (armBase(before) - armBase(after)) * 0.35
}

export function bodyShape(sex: Sex, w: Widths, arm = armBase(w)): BodyShape {
  const female = sex === 'female'
  const { neck, shoulder, chest, waist, navel, hip } = w
  const Y = LEVEL_Y
  const a = arm

  // Lado derecho completo, de la nuca a la entrepierna (x relativo al eje central):
  // hombro → brazo por fuera → mano → brazo por dentro → axila → tronco → pierna.
  const right: Pt[] = [
    [neck * 0.95, 52],
    [neck, 70],
    [neck + (shoulder - neck) * 0.5, 78],
    [shoulder - 8, 84],
    [shoulder, 100],
    // brazo (exterior)
    [a + 21, 133],
    [a + 24, 183],
    [a + 26, 233],
    [a + 25, 252],
    [a + 20, 258],
    [a + 15, 252],
    // brazo (interior)
    [a + 12, 213],
    [a + 8, 167],
    [a + 3, 125],
    // axila y tronco
    [chest + 1, 118],
    [chest + (female ? 0.5 : 0), 128],
    [waist, Y.waist_cm],
    [navel, Y.navel_cm],
    [hip, Y.hip_cm],
    [hip - 1, 212],
    // pierna (exterior)
    [hip * 0.92, 250],
    [hip * 0.75, 317],
    [hip * 0.72, 350],
    [Math.max(16, hip * 0.58), 400],
    [Math.max(17, hip * 0.6), 420],
    [Math.max(13, hip * 0.48), 431],
    // pierna (interior)
    [4, 430],
    [4.7, 400],
    [3.5, 350],
    [3.3, 317],
    [2.5, 250],
    [0, 226],
  ]
  const left = right
    .slice(0, -1)
    .reverse()
    .map(([x, y]) => [-x, y] as Pt)
  const pts = [...right, ...left].map(([x, y]) => [CX + x, y] as Pt)

  return {
    path: smoothClosed(pts),
    head: { cx: CX, cy: 33, rx: 20, ry: 25 },
    widths: { neck_cm: neck, waist_cm: waist, navel_cm: navel, hip_cm: hip },
  }
}

/**
 * Coloca las etiquetas junto a sus niveles evitando solapes
 * (separación mínima `gap`), conservando el orden vertical.
 */
export function spreadLabels(ys: number[], gap: number, min = 0, max = BODY_H): number[] {
  const out = [...ys]
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + gap)
  const overflow = out[out.length - 1] - max
  if (overflow > 0) for (let i = 0; i < out.length; i++) out[i] -= overflow
  for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] - gap)
  if (out[0] < min) {
    const shift = min - out[0]
    for (let i = 0; i < out.length; i++) out[i] += shift
  }
  return out
}

/** Colores de la silueta (diseño): cuerpo actual, contorno de inicio y zona perdida. */
export const SILHOUETTE_COLORS = {
  fill: '#d6ebdf',
  stroke: '#1f7449',
  before: '#c0392b',
  lost: '#fbe6e3',
} as const
