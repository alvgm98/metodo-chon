import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { lineGeometry, nearestIndex, type Box } from '@/lib/chart'
import { fmtDate, fmtDateShort, fmtDelta, fmtNum } from '@/lib/format'
import type { Band, Point } from '@/lib/metrics'
import { cx } from './ui'

export const BAND_FILL: Record<Band['tone'], string> = {
  low: '#e7eef7',
  ok: '#e6f3ea',
  warn: '#fcf0de',
  risk: '#fbe3e3',
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export interface LineChartProps {
  data: Point[]
  unit: string
  decimals?: 1 | 2
  height?: number
  bands?: Band[]
  threshold?: number
  domain?: [number, number]
  minSpan?: number
  /** "kg" → "−1,2 kg vs. anterior" */
  label: string
  compact?: boolean
}

/** Gráfica de línea interactiva: ratón, toque y flechas del teclado. */
export function LineChart({ data, unit, decimals = 1, height = 300, bands, threshold, domain, minSpan, label, compact }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const gradientId = useId()
  const [active, setActive] = useState(data.length - 1)

  // Vuelve al último punto solo si cambian los datos (no la identidad del array).
  const signature = data.map((p) => `${p.date}:${p.value}`).join('|')
  useEffect(() => setActive(data.length - 1), [signature, data.length])

  const tipRef = useRef<HTMLDivElement>(null)
  const [tipWidth, setTipWidth] = useState(150)

  const box: Box = { width: Math.max(width, 1), height, top: TIP_BAND + 10, right: compact ? 14 : 20, bottom: 30, left: compact ? 38 : 48 }
  const g = useMemo(
    () => lineGeometry(data, box, { domain, minSpan }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, width, height, domain?.[0], domain?.[1], minSpan, compact],
  )

  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setActive(nearestIndex(g.points, e.clientX - rect.left))
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, i - 1))
    else if (e.key === 'ArrowRight') setActive((i) => Math.min(data.length - 1, i + 1))
    else return
    e.preventDefault()
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-canvas text-ink-soft" style={{ height }}>
        Aún no hay datos para esta medida.
      </div>
    )
  }

  const p = g.points[Math.min(active, g.points.length - 1)]
  const prev = active > 0 ? g.points[active - 1] : null
  const fmtTick = (v: number) => fmtNum(v, decimals).replace(/,0+$/, '')
  // El tooltip vive en una franja superior propia: nunca tapa la línea.
  const tipLeft = p ? Math.min(Math.max(p.x - tipWidth / 2, 0), Math.max(0, width - tipWidth)) : 0

  return (
    <div ref={ref} className="relative select-none" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="block touch-pan-y outline-none"
          role="img"
          aria-label={`${label}: ${data.length} mediciones. Usa las flechas para recorrerlas.`}
          tabIndex={0}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onKeyDown={onKey}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={bands ? 0 : 0.16} />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {bands?.map((b) => {
            const top = g.y(Math.min(b.to, g.yTicks[g.yTicks.length - 1].value))
            const bottom = g.y(Math.max(b.from, g.yTicks[0].value))
            if (bottom <= top) return null
            return <rect key={b.label} x={g.plot.x0} y={top} width={g.plot.x1 - g.plot.x0} height={bottom - top} fill={BAND_FILL[b.tone]} />
          })}

          {g.yTicks.map((t) => (
            <g key={t.value}>
              <line x1={g.plot.x0} x2={g.plot.x1} y1={t.y} y2={t.y} stroke="var(--color-line)" strokeWidth={1} />
              <text x={g.plot.x0 - 10} y={t.y} dy="0.32em" textAnchor="end" className="fill-ink-faint text-[11px]">
                {fmtTick(t.value)}
              </text>
            </g>
          ))}
          {g.xTicks.map((t) => (
            <text key={t.label + t.x} x={t.x} y={height - 8} textAnchor="middle" className="fill-ink-faint text-[11px]">
              {t.label}
            </text>
          ))}

          {threshold != null && (
            <line x1={g.plot.x0} x2={g.plot.x1} y1={g.y(threshold)} y2={g.y(threshold)} stroke="var(--color-danger)" strokeWidth={1.5} strokeDasharray="5 4" />
          )}

          {g.area && <path d={g.area} fill={`url(#${CSS.escape(gradientId)})`} />}
          <path d={g.line} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {p && <line x1={p.x} x2={p.x} y1={TIP_BAND - 4} y2={g.plot.y1} stroke="var(--color-brand)" strokeOpacity={0.5} strokeDasharray="3 4" />}

          {g.points.map((pt, i) => (
            <circle
              key={pt.date + i}
              cx={pt.x}
              cy={pt.y}
              r={i === active ? 7 : 4.5}
              fill={i === active ? 'var(--color-brand)' : '#fff'}
              stroke="var(--color-brand)"
              strokeWidth={2}
            />
          ))}
        </svg>
      )}

      {p && width > 0 && (
        <Tooltip
          ref={tipRef}
          left={tipLeft}
          onWidth={setTipWidth}
          value={`${fmtNum(p.value, decimals)} ${unit}`.trim()}
          date={fmtDate(p.date)}
          delta={prev ? `${fmtDelta(p.value - prev.value, decimals)} ${unit}`.trim() : null}
        />
      )}
    </div>
  )
}

const TIP_BAND = 54

const Tooltip = ({
  ref,
  left,
  onWidth,
  value,
  date,
  delta,
}: {
  ref: RefObject<HTMLDivElement | null>
  left: number
  onWidth: (w: number) => void
  value: string
  date: string
  delta: string | null
}) => {
  useLayoutEffect(() => {
    if (ref.current) onWidth(ref.current.offsetWidth)
  })
  return (
    <div
      ref={ref}
      aria-live="polite"
      className="pointer-events-none absolute top-0 z-10 rounded-xl bg-ink px-3 py-2 text-white shadow-lg transition-[left] duration-100"
      style={{ left }}
    >
      <div className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="text-[17px] leading-tight font-bold">{value}</span>
        {delta && <span className="text-[13px] font-semibold text-brand-200">{delta}</span>}
      </div>
      <div className="text-[12.5px] whitespace-nowrap text-white/75">
        {date}
        {delta && ' · vs. anterior'}
      </div>
    </div>
  )
}

/** Mini gráfica sin ejes. */
export function Sparkline({ data, height = 64, className, stroke = 'var(--color-brand)', fill = 'var(--color-brand-50)' }: {
  data: Point[]
  height?: number
  className?: string
  stroke?: string
  fill?: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const g = useMemo(
    () => lineGeometry(data, { width: Math.max(width, 1), height, top: 4, right: 2, bottom: 2, left: 2 }, { xTicks: false, tickCount: 2, minSpan: 0.5 }),
    [data, width, height],
  )
  return (
    <div ref={ref} className={cx('w-full', className)} style={{ height }}>
      {width > 0 && data.length > 1 && (
        <svg width={width} height={height} aria-hidden className="block">
          <path d={g.area} fill={fill} />
          <path d={g.line} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

export function ChartCaption({ points, unit, decimals = 1 }: { points: Point[]; unit: string; decimals?: 1 | 2 }) {
  if (points.length < 2) return null
  const first = points[0]
  const last = points[points.length - 1]
  return (
    <>
      {fmtDelta(last.value - first.value, decimals)} {unit} entre el {fmtDateShort(first.date)}
      {first.date.slice(0, 4) !== last.date.slice(0, 4) ? ` ${first.date.slice(0, 4)}` : ''} y el {fmtDate(last.date)}
    </>
  )
}
