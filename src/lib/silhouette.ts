// Silueta orientativa (viewBox 0 0 200 420) con aros a escala del perímetro.
import type { MetricKey, Sex } from './types'

type Pt = [number, number]

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
const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [200 - x, y] as Pt)

/** Lado derecho del cuerpo, de la nuca a la entrepierna (se refleja). */
const BODY: Record<Sex, Pt[]> = {
  female: [
    [110, 60], [112, 78], [128, 88], [143, 96], [147, 112], [143, 140], [137, 168],
    [140, 192], [150, 222], [151, 246], [142, 270], [137, 310], [130, 360], [127, 402],
    [109, 404], [107, 360], [104, 300], [100, 282],
  ],
  male: [
    [111, 60], [114, 80], [134, 88], [154, 96], [157, 114], [152, 145], [146, 172],
    [146, 196], [148, 222], [148, 246], [141, 270], [137, 310], [131, 360], [128, 402],
    [109, 404], [107, 360], [104, 300], [100, 284],
  ],
}

const ARM: Record<Sex, Pt[]> = {
  female: [[144, 96], [157, 106], [161, 150], [165, 200], [166, 240], [158, 252], [152, 238], [150, 200], [146, 152], [141, 116]],
  male: [[154, 96], [168, 108], [172, 152], [175, 200], [175, 240], [167, 254], [160, 240], [159, 200], [155, 154], [150, 118]],
}

function bodyPath(sex: Sex): string {
  const right = BODY[sex]
  const left = mirror(right).reverse()
  return smoothClosed([...right, ...left.slice(1, -1)])
}

export interface Ring {
  key: MetricKey
  cx: number
  cy: number
  rx: number
  ry: number
}

const RING_Y: Partial<Record<MetricKey, number>> = {
  neck_cm: 74,
  waist_cm: 168,
  navel_cm: 192,
  hip_cm: 232,
}

/** px por cm de radio: 100 cm de cadera ≈ aro de 56 px de semieje. */
const PX_PER_CM = 56 / (100 / (2 * Math.PI))

export function ring(key: MetricKey, perimeterCm: number): Ring | null {
  const cy = RING_Y[key]
  if (cy == null || !perimeterCm) return null
  const rx = (perimeterCm / (2 * Math.PI)) * PX_PER_CM
  return { key, cx: 100, cy, rx, ry: Math.max(4, rx * 0.17) }
}

export function silhouette(sex: Sex) {
  return {
    viewBox: '0 0 200 420',
    head: { cx: 100, cy: 34, rx: 21, ry: 25 },
    body: bodyPath(sex),
    arms: [smoothClosed(ARM[sex]), smoothClosed(mirror(ARM[sex]))],
  }
}
