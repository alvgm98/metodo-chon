// Geometría de gráficas compartida por los componentes SVG del navegador y el
// informe PDF (@react-pdf/renderer), para que ambos dibujen exactamente lo mismo.
import { fmtMonth, parseDate } from './format'
import type { Point } from './metrics'

export interface Box {
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

export interface PlotPoint extends Point {
  x: number
  y: number
}

export interface LineGeometry {
  points: PlotPoint[]
  line: string
  area: string
  yTicks: { value: number; y: number }[]
  xTicks: { label: string; x: number }[]
  y: (v: number) => number
  plot: { x0: number; x1: number; y0: number; y1: number }
}

/** Dominio "redondo" con 3–5 marcas que contiene [min, max]. */
export function niceDomain(min: number, max: number, minSpan = 1, tickCount = 4): { lo: number; hi: number; step: number } {
  if (max - min < minSpan) {
    const mid = (min + max) / 2
    min = mid - minSpan / 2
    max = mid + minSpan / 2
  }
  const rough = (max - min) / tickCount
  const pow = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  return { lo: clean(lo), hi: clean(hi), step }
}

const clean = (n: number) => Math.round(n * 1e6) / 1e6

export interface LineOptions {
  /** fuerza el dominio Y (p. ej. para incluir bandas de referencia) */
  domain?: [number, number]
  minSpan?: number
  tickCount?: number
  xTicks?: boolean
}

export function lineGeometry(data: Point[], box: Box, opts: LineOptions = {}): LineGeometry {
  const x0 = box.left
  const x1 = box.width - box.right
  const y0 = box.top
  const y1 = box.height - box.bottom

  const values = data.map((p) => p.value)
  const dMin = Math.min(...values, ...(opts.domain ? [opts.domain[0]] : []))
  const dMax = Math.max(...values, ...(opts.domain ? [opts.domain[1]] : []))
  const { lo, hi, step } =
    data.length || opts.domain
      ? niceDomain(dMin, dMax, opts.minSpan ?? 1, opts.tickCount ?? 4)
      : { lo: 0, hi: 1, step: 1 }

  const times = data.map((p) => parseDate(p.date).getTime())
  const tMin = Math.min(...times)
  const tMax = Math.max(...times)
  const x = (t: number) => (tMax === tMin ? (x0 + x1) / 2 : x0 + ((t - tMin) / (tMax - tMin)) * (x1 - x0))
  const y = (v: number) => y1 - ((v - lo) / (hi - lo || 1)) * (y1 - y0)

  const points = data.map((p, i) => ({ ...p, x: x(times[i]), y: y(p.value) }))
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${r(p.x)},${r(p.y)}`).join(' ')
  const area =
    points.length > 1
      ? `${line} L${r(points[points.length - 1].x)},${r(y1)} L${r(points[0].x)},${r(y1)} Z`
      : ''

  const yTicks: LineGeometry['yTicks'] = []
  for (let v = lo; v <= hi + step / 2; v += step) yTicks.push({ value: clean(v), y: y(v) })

  const xTicks: LineGeometry['xTicks'] = []
  if (opts.xTicks !== false && points.length > 1) {
    const start = new Date(tMin)
    const months: Date[] = []
    for (let d = new Date(start.getFullYear(), start.getMonth() + 1, 1); d.getTime() <= tMax; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      months.push(d)
    }
    const minGap = 44
    const every = Math.max(1, Math.ceil((months.length * minGap) / Math.max(1, x1 - x0)))
    months.forEach((d, i) => {
      if (i % every) return
      const multiYear = new Date(tMin).getFullYear() !== new Date(tMax).getFullYear()
      const label = d.getMonth() === 0 && multiYear ? String(d.getFullYear()) : fmtMonth(d)
      xTicks.push({ label, x: x(d.getTime()) })
    })
  }

  return { points, line, area, yTicks, xTicks, y, plot: { x0, x1, y0, y1 } }
}

const r = (n: number) => Math.round(n * 10) / 10

/** Índice del punto más cercano en X. */
export function nearestIndex(points: PlotPoint[], px: number): number {
  let best = 0
  let bestDist = Infinity
  points.forEach((p, i) => {
    const d = Math.abs(p.x - px)
    if (d < bestDist) {
      best = i
      bestDist = d
    }
  })
  return best
}
