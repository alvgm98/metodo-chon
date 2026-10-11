import { useState } from 'react'
import { fmtDate, fmtDelta, fmtNum } from '@/lib/format'
import { PERIMETERS, series, summarize } from '@/lib/metrics'
import { AMPLIFY, BODY_H, LEVEL_Y, amplified, bodyShape, perimetersFrom, spreadLabels, type PerimeterKey } from '@/lib/silhouette'
import type { Measurement, Sex } from '@/lib/types'

const LABEL: Record<PerimeterKey, string> = {
  neck_cm: 'Cuello',
  waist_cm: 'Cintura estrecha',
  navel_cm: 'Zona ombligo',
  hip_cm: 'Cadera',
}

const W = 480
const FIG_X = 12 // desplazamiento de la figura (viewBox de la silueta: 200 de ancho)
const CX = FIG_X + 100
const LABEL_X = 262

/**
 * Silueta "antes y ahora": el cuerpo se dibuja a partir de los perímetros de la
 * primera (contorno rojo discontinuo) y de la última medición (verde), superpuestos.
 */
export function BodyComparison({ sex, measurements }: { sex: Sex; measurements: Measurement[] }) {
  const [highlight, setHighlight] = useState(true)
  const rows = PERIMETERS.map((m) => ({ key: m.key as PerimeterKey, s: summarize(series(measurements, m.key)) })).filter(
    (r) => r.s,
  )
  if (rows.length === 0) return <p className="text-ink-soft">Aún no hay perímetros registrados.</p>

  const compare = rows.some((r) => r.s!.first.date !== r.s!.last.date)
  const firstOf = Object.fromEntries(rows.map((r) => [r.key, r.s!.first.value]))
  const lastOf = Object.fromEntries(rows.map((r) => [r.key, r.s!.last.value]))
  // Los perímetros sin dato toman el valor del otro momento para no inventar cambios.
  const lastP = perimetersFrom(sex, { ...firstOf, ...lastOf })
  const firstP = perimetersFrom(sex, { ...lastOf, ...firstOf })
  const before = bodyShape(sex, highlight ? amplified(firstP, lastP, AMPLIFY) : firstP)
  const after = bodyShape(sex, lastP)

  const labelYs = spreadLabels(
    rows.map((r) => LEVEL_Y[r.key]),
    58,
    40,
    BODY_H - 20,
  )
  const dates = measurements.map((m) => m.measured_on).sort()

  const figure = (
    <>
      {compare && <path d={before.path} fill="var(--color-danger)" fillOpacity={0.1} stroke="none" />}
      {after.arms.map((d) => (
        <path key={d} d={d} fill="#c4dccd" stroke="var(--color-brand)" strokeWidth={1.2} strokeOpacity={0.45} />
      ))}
      <path d={after.path} fill="#c4dccd" stroke="var(--color-brand)" strokeWidth={1.5} strokeOpacity={0.7} />
      <ellipse {...after.head} fill="#c4dccd" stroke="var(--color-brand)" strokeWidth={1.5} strokeOpacity={0.7} />
      {compare && <path d={before.path} fill="none" stroke="var(--color-danger)" strokeWidth={1.6} strokeDasharray="5 4" />}
    </>
  )

  return (
    <div>
      {/* Móvil: figura sola + lista; las etiquetas dentro del SVG quedarían diminutas */}
      <div className="sm:hidden">
        <svg viewBox={`0 0 224 ${BODY_H + 6}`} className="mx-auto block h-auto w-full max-w-[260px]" aria-hidden>
          <g transform="translate(12, 0)">{figure}</g>
          {rows.map((r) => (
            <line key={r.key} x1={CX - after.widths[r.key]} x2={CX + after.widths[r.key]} y1={LEVEL_Y[r.key]} y2={LEVEL_Y[r.key]} stroke="var(--color-brand)" strokeWidth={2} strokeDasharray="1 4" strokeLinecap="round" />
          ))}
        </svg>
        <ul className="mt-4 space-y-2">
          {rows.map((r) => {
            const s = r.s!
            const changed = compare && s.first.date !== s.last.date
            return (
              <li key={r.key} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
                <div>
                  <div className="font-semibold">{LABEL[r.key]}</div>
                  <div className="tabular text-sm">
                    {changed && (
                      <>
                        <span className="text-danger">{fmtNum(s.first.value)}</span>
                        <span className="mx-1.5 text-ink-faint">→</span>
                      </>
                    )}
                    <span className="font-semibold text-brand-dark">{fmtNum(s.last.value)} cm</span>
                  </div>
                </div>
                {changed && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-dark">{fmtDelta(s.delta)} cm</span>}
              </li>
            )
          })}
        </ul>
      </div>

      <svg viewBox={`0 0 ${W} ${BODY_H + 6}`} className="hidden h-auto w-full sm:block" role="img" aria-label="Comparación de la silueta entre la primera y la última medición">
        <g transform={`translate(${FIG_X}, 0)`}>{figure}</g>
        {rows.map((r, i) => {
          const y = LEVEL_Y[r.key]
          const ly = labelYs[i]
          const wa = after.widths[r.key]
          const edge = CX + Math.max(wa, compare ? before.widths[r.key] : 0) + 6
          const s = r.s!
          const changed = compare && s.first.date !== s.last.date
          return (
            <g key={r.key}>
              {/* cinta métrica sobre el cuerpo actual */}
              <line x1={CX - wa} x2={CX + wa} y1={y} y2={y} stroke="var(--color-brand)" strokeWidth={2} strokeDasharray="1 4" strokeLinecap="round" />
              <polyline
                points={`${edge},${y} ${LABEL_X - 26},${y} ${LABEL_X - 10},${ly} ${LABEL_X - 4},${ly}`}
                fill="none"
                stroke="var(--color-line-strong)"
                strokeWidth={1.2}
              />
              <circle cx={edge} cy={y} r={2.5} fill="var(--color-brand)" />
              <text x={LABEL_X} y={ly - 6} className="fill-ink text-[17px] font-semibold">
                {LABEL[r.key]}
              </text>
              <text x={LABEL_X} y={ly + 16} className="text-[16px]">
                {changed && (
                  <>
                    <tspan className="fill-danger">{fmtNum(s.first.value)}</tspan>
                    <tspan className="fill-ink-faint"> → </tspan>
                  </>
                )}
                <tspan className="fill-brand-dark font-bold">{fmtNum(s.last.value)} cm</tspan>
              </text>
              {changed && (
                <text x={W - 4} y={ly - 6} textAnchor="end" className="fill-brand-dark text-[16px] font-bold">
                  {fmtDelta(s.delta)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {compare && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-2">
            <span className="w-6 border-t-2 border-dashed border-danger" /> Inicio · {fmtDate(dates[0])}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-6 rounded-sm border border-brand/70 bg-[#c4dccd]" /> Ahora · {fmtDate(dates[dates.length - 1])}
          </span>
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 font-medium text-ink">
            <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
            Resaltar cambios
          </label>
          {highlight && <p className="w-full text-xs">Diferencias del contorno ampliadas ×{AMPLIFY} para que se aprecien; las cifras son las reales.</p>}
        </div>
      )}
    </div>
  )
}
