// Silueta paramétrica (viewBox 0 0 200 430): el contorno se calcula a partir de
// los perímetros medidos, para poder superponer el cuerpo "antes" y "ahora".
import type { MetricKey, Sex } from './types'

type Pt = [number, number]

export const BODY_W = 200
export const BODY_H = 430
const CX = BODY_W / 2

export type PerimeterKey = Extract<MetricKey, 'neck_cm' | 'waist_cm' | 'navel_cm' | 'hip_cm'>
export type Perimeters = Record<PerimeterKey, number>

/** Altura (y) a la que se mide cada perímetro. */
export const LEVEL_Y: Record<PerimeterKey, number> = {
  neck_cm: 70,
  waist_cm: 168,
  navel_cm: 196,
  hip_cm: 234,
}

const DEFAULTS: Record<Sex, Perimeters> = {
  female: { neck_cm: 34, waist_cm: 74, navel_cm: 86, hip_cm: 100 },
  male: { neck_cm: 39, waist_cm: 86, navel_cm: 92, hip_cm: 100 },
}

/** Completa los perímetros que falten con valores de referencia. */
export function perimetersFrom(sex: Sex, values: Partial<Record<PerimeterKey, number | null>>): Perimeters {
  const d = DEFAULTS[sex]
  return {
    neck_cm: values.neck_cm ?? d.neck_cm,
    waist_cm: values.waist_cm ?? d.waist_cm,
    navel_cm: values.navel_cm ?? d.navel_cm,
    hip_cm: values.hip_cm ?? d.hip_cm,
  }
}

/**
 * Semiancho en px para un perímetro en cm. El tronco es más ancho que profundo
 * (≈ elipse 1,1:1), y 1 cm de anchura ≈ 3,2 px: 100 cm de cadera ≈ 56 px.
 */
export function halfWidth(perimeterCm: number): number {
  return Math.min(92, Math.max(10, perimeterCm * 0.56))
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
  path: string
  arms: [string, string]
  head: { cx: number; cy: number; rx: number; ry: number }
  /** semiancho del cuerpo en cada nivel de medida */
  widths: Record<PerimeterKey, number>
}

export function bodyShape(sex: Sex, p: Perimeters): BodyShape {
  const neck = halfWidth(p.neck_cm) * 0.62 // el cuello se ve más estrecho que su perímetro
  const waist = halfWidth(p.waist_cm)
  const navel = halfWidth(p.navel_cm)
  const hip = halfWidth(p.hip_cm)
  const female = sex === 'female'
  const shoulder = Math.max(female ? 52 : 62, waist + (female ? 4 : 6))
  const chest = female ? Math.max(waist + 7, shoulder - 5) : Math.max(waist + 4, shoulder - 7)
  const leg = Math.max(hip * 0.8, 30)

  // Lado derecho, de la nuca a la entrepierna; x relativo al eje central.
  const right: Pt[] = [
    [neck, 44],
    [neck, LEVEL_Y.neck_cm + 6],
    [neck + (shoulder - neck) * 0.6, 84],
    [shoulder - 2, 92],
    [shoulder + 2, 104],
    [shoulder - 2, 124],
    [chest, 140],
    [waist, LEVEL_Y.waist_cm],
    [navel, LEVEL_Y.navel_cm],
    [hip, LEVEL_Y.hip_cm],
    [hip - 3, 262],
    [leg, 296],
    [Math.max(leg * 0.62, 22), 350],
    [Math.max(leg * 0.56, 20), 378],
    [16, 412],
    [17, 424],
    [5, 425],
    [6, 408],
    [7, 350],
    [4, 300],
    [0, 286],
  ]
  const left = right
    .slice(0, -1)
    .reverse()
    .map(([x, y]) => [-x, y] as Pt)
  const pts = [...right, ...left].map(([x, y]) => [CX + x, y] as Pt)

  // Brazos (no dependen de las medidas): cuelgan junto al hombro.
  const arm = (dir: 1 | -1): string => {
    const a: Pt[] = [
      [shoulder - 6, 92],
      [shoulder + 8, 100],
      [shoulder + 13, 150],
      [shoulder + 15, 205],
      [shoulder + 14, 248],
      [shoulder + 6, 262],
      [shoulder + 1, 248],
      [shoulder + 1, 205],
      [shoulder - 1, 150],
      [shoulder - 6, 118],
    ]
    return smoothClosed(a.map(([x, y]) => [CX + dir * x, y] as Pt))
  }

  return {
    path: smoothClosed(pts),
    arms: [arm(1), arm(-1)],
    head: { cx: CX, cy: 30, rx: 18, ry: 23 },
    widths: { neck_cm: neck, waist_cm: waist, navel_cm: navel, hip_cm: hip },
  }
}

/** Factor con el que se amplía la diferencia antes/ahora para que se aprecie. */
export const AMPLIFY = 3

/** Perímetros "de inicio" con la diferencia respecto a ahora multiplicada por `factor`. */
export function amplified(first: Perimeters, last: Perimeters, factor: number): Perimeters {
  const out = { ...first }
  for (const k of Object.keys(out) as PerimeterKey[]) out[k] = last[k] + (first[k] - last[k]) * factor
  return out
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
