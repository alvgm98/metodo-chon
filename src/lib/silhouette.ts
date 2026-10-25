// Silueta orientativa (viewBox 0 0 200 430) para comparar "antes" y "ahora".
//
// Dos capas, a propósito:
// 1. La FIGURA es siempre un cuerpo humano bien proporcionado (base por sexo). Las
//    medidas solo la ajustan con suavidad, para que nunca resulte una caricatura.
// 2. La DIFERENCIA entre inicio y ahora se dibuja a escala real del cambio en cm
//    (o ampliada), que es lo que el cliente necesita ver.
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
  female: { neck: 10, shoulder: 49, chest: 43, waist: 33, navel: 38, hip: 47 },
  male: { neck: 12.5, shoulder: 57, chest: 50, waist: 41, navel: 43, hip: 45 },
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

/** Factor con el que se amplía la diferencia antes/ahora para que se aprecie. */
export const AMPLIFY = 3

/**
 * Figura del "inicio": la de ahora más la diferencia de cada perímetro a escala real
 * (multiplicada por `factor` si se resaltan los cambios).
 */
export function widthsWithChange(sex: Sex, last: Perimeters, first: Perimeters, factor = 1): Widths {
  const w = figureWidths(sex, last)
  const d = (k: PerimeterKey) => (first[k] - last[k]) * PX_PER_CM * factor
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
  path: string
  arms: [string, string]
  head: { cx: number; cy: number; rx: number; ry: number }
  /** semiancho del cuerpo en cada nivel de medida */
  widths: Record<PerimeterKey, number>
}

export function bodyShape(sex: Sex, w: Widths): BodyShape {
  const female = sex === 'female'
  const { neck, shoulder, chest, waist, navel, hip } = w
  const Y = LEVEL_Y

  // Piernas: cada una centrada en ±legC; el muslo arranca a la anchura de la cadera.
  const legC = Math.max(19, hip * 0.46)
  const knee = female ? 11 : 12
  const calf = female ? 12.5 : 13.5

  // Lado derecho, de la nuca a la entrepierna; x relativo al eje central.
  const right: Pt[] = [
    [neck * 0.95, 40],
    [neck, Y.neck_cm + 6],
    [neck + (shoulder - neck) * 0.45, 69],
    [shoulder - 7, 75],
    [shoulder, 87],
    [shoulder - 3, 101],
    [chest - 1, 111],
    [chest + (female ? 1.5 : 0), 123],
    [(chest + waist) / 2 + 1, 135],
    [waist, Y.waist_cm],
    [navel, Y.navel_cm],
    [hip, Y.hip_cm],
    [hip - 2, 213],
    [legC + (hip - legC) * 0.74, 250],
    [legC + knee + 1, 300],
    [legC + knee - 1, 316],
    [legC + calf, 348],
    [legC + 6, 398],
    [legC + 6, 414],
    [legC + 12, 424],
    [legC + 9, 429],
    [legC - 5, 428],
    [legC - 6, 414],
    [legC - 6.5, 398],
    [legC - calf + 1.5, 350],
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
  const lower = Math.max(shoulder + 3, hip + 4)
  const arm = (dir: 1 | -1): string => {
    const a: Pt[] = [
      [shoulder - 5, 79],
      [shoulder + 4, 85],
      [shoulder + 6.5, 110],
      [(shoulder + lower) / 2 + 6.5, Y.waist_cm],
      [lower + 9, 190],
      [lower + 11, 214],
      [lower + 13, 232],
      [lower + 9, 246],
      [lower + 4.5, 242],
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
    head: { cx: CX, cy: 24, rx: 15.5, ry: 20.5 },
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
