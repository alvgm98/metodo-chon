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
  neck_cm: 54,
  waist_cm: 148,
  navel_cm: 168,
  hip_cm: 196,
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
  const female = sex === 'female'
  const neck = halfWidth(p.neck_cm) * 0.55 // el cuello se ve más estrecho que su perímetro
  const waist = halfWidth(p.waist_cm)
  const navel = halfWidth(p.navel_cm)
  const hip = halfWidth(p.hip_cm)
  const shoulder = Math.max(female ? 52 : 62, waist + (female ? 6 : 8))
  const chest = female ? Math.max(waist + 6, shoulder - 8) : Math.max(waist + 5, shoulder - 6)
  const Y = LEVEL_Y

  // Piernas: cada una centrada en ±legC; el muslo arranca a la anchura de la cadera.
  const legC = Math.max(20, hip * 0.46)
  const knee = 12
  const calf = female ? 13 : 14

  // Lado derecho, de la nuca a la entrepierna; x relativo al eje central.
  const right: Pt[] = [
    [neck * 0.95, 40],
    [neck, Y.neck_cm + 6],
    [neck + (shoulder - neck) * 0.45, 70],
    [shoulder - 7, 76],
    [shoulder, 88],
    [shoulder - 3, 102],
    [chest - 1, 112],
    [chest + (female ? 1 : 0), 124],
    [(chest + waist) / 2 + 1, 136],
    [waist, Y.waist_cm],
    [navel, Y.navel_cm],
    [hip, Y.hip_cm],
    [hip - 2, 214],
    [legC + (hip - legC) * 0.78, 250],
    [legC + knee + 1, 300],
    [legC + knee - 1, 316],
    [legC + calf, 348],
    [legC + 6, 398],
    [legC + 6, 414],
    [legC + 13, 424],
    [legC + 10, 429],
    [legC - 5, 428],
    [legC - 6, 414],
    [legC - 7, 398],
    [legC - calf + 1, 350],
    [legC - knee + 2, 316],
    [legC - knee, 300],
    [Math.max(3, legC - (hip - legC) * 0.9), 240],
    [0, 222],
  ]
  const left = right
    .slice(0, -1)
    .reverse()
    .map(([x, y]) => [-x, y] as Pt)
  const pts = [...right, ...left].map(([x, y]) => [CX + x, y] as Pt)

  // Brazos en ligera "A": hombro, codo a la altura de la cintura y mano a la del pubis.
  const lower = Math.max(shoulder + 4, hip + 5)
  const arm = (dir: 1 | -1): string => {
    const a: Pt[] = [
      [shoulder - 5, 80],
      [shoulder + 4, 86],
      [shoulder + 7, 110],
      [(shoulder + lower) / 2 + 7, Y.waist_cm],
      [lower + 10, 190],
      [lower + 12, 214],
      [lower + 14, 232],
      [lower + 10, 246],
      [lower + 5, 242],
      [lower + 2, 228],
      [lower + 2, 212],
      [lower - 1, 190],
      [(shoulder + lower) / 2 - 3, Y.waist_cm],
      [shoulder - 5, 118],
      [shoulder - 8, 102],
    ]
    return smoothClosed(a.map(([x, y]) => [CX + dir * x, y] as Pt))
  }

  return {
    path: smoothClosed(pts),
    arms: [arm(1), arm(-1)],
    head: { cx: CX, cy: 24, rx: 16, ry: 21 },
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
