import { ArrowDown, ArrowUp } from 'lucide-react'
import { daysBetween, fmtDate, fmtDateShort, fmtDelta, fmtNum } from '@/lib/format'
import { PERIMETERS, series, summarize, type Summary } from '@/lib/metrics'
import { BODY_H, LEVEL_Y, SILHOUETTE_COLORS as S, beforeArmBase, bodyShape, figureWidths, perimetersFrom, widthsWithChange, type PerimeterKey } from '@/lib/silhouette'
import type { Measurement, Sex } from '@/lib/types'
import { cx } from './ui'

const LABEL: Record<PerimeterKey, string> = {
  neck_cm: 'Cuello',
  waist_cm: 'Cintura estrecha',
  navel_cm: 'Zona ombligo',
  hip_cm: 'Cadera',
}

const CX = 112 // centro de la figura dentro del viewBox (la silueta mide 200 y se desplaza 12)

interface Row {
  key: PerimeterKey
  s: Summary
  changed: boolean
}

/**
 * Perímetros "antes y ahora": silueta superpuesta (inicio en discontinuo, ahora en verde)
 * con una lista numerada de cada zona y el total de centímetros.
 */
export function BodyComparison({ sex, measurements, title }: { sex: Sex; measurements: Measurement[]; title: string }) {
  const rows: Row[] = PERIMETERS.flatMap((m) => {
    const s = summarize(series(measurements, m.key))
    return s ? [{ key: m.key as PerimeterKey, s, changed: s.first.date !== s.last.date }] : []
  })

  if (rows.length === 0) {
    return (
      <>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-ink-soft">Aún no hay perímetros registrados.</p>
      </>
    )
  }

  const compare = rows.some((r) => r.changed)
  const firstOf = Object.fromEntries(rows.map((r) => [r.key, r.s.first.value]))
  const lastOf = Object.fromEntries(rows.map((r) => [r.key, r.s.last.value]))
  // Los perímetros sin dato toman el valor del otro momento para no inventar cambios.
  const lastP = perimetersFrom(sex, { ...firstOf, ...lastOf })
  const firstP = perimetersFrom(sex, { ...lastOf, ...firstOf })
  const afterW = figureWidths(sex, lastP)
  const beforeW = widthsWithChange(sex, lastP, firstP)
  const after = bodyShape(sex, afterW)
  const before = bodyShape(sex, beforeW, beforeArmBase(afterW, beforeW))

  const changedRows = rows.filter((r) => r.changed)
  const total = Math.round(changedRows.reduce((acc, r) => acc + r.s.delta, 0) * 10) / 10
  const reduced = changedRows.filter((r) => r.s.delta < 0).length
  const firstDate = rows.map((r) => r.s.first.date).sort()[0]
  const lastDate = rows.map((r) => r.s.last.date).sort().at(-1)!
  const days = daysBetween(firstDate, lastDate)
  // Las barras comparten escala: el perímetro mayor ocupa todo el ancho.
  const scale = Math.max(...rows.map((r) => Math.max(r.s.first.value, r.s.last.value)))

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-1 text-ink-soft">
            {compare ? (
              <>
                {fmtDateShort(firstDate)} → {fmtDate(lastDate)} · {days} {days === 1 ? 'día' : 'días'} entre la primera y la
                última medición
              </>
            ) : (
              <>Primera medición · {fmtDate(lastDate)}</>
            )}
          </p>
        </div>
        {compare && (
          <div className="shrink-0 self-start rounded-2xl bg-brand-50 px-5 py-3 text-center">
            <div className="font-display text-3xl font-extrabold tracking-tight text-brand-dark">
              {fmtDelta(total)} cm
            </div>
            <div className="text-sm text-ink-soft">
              en total · {reduced === changedRows.length ? reduced : `${reduced} de ${changedRows.length}`}{' '}
              {reduced === 1 ? 'zona reducida' : 'zonas reducidas'}
            </div>
          </div>
        )}
      </header>

      <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,240px)_1fr] sm:gap-10">
        {/* Figura */}
        <div className="flex flex-col rounded-3xl bg-canvas px-4 pt-5 pb-4">
          <svg
            viewBox={`0 0 224 ${BODY_H + 6}`}
            className="mx-auto block h-auto w-full max-w-[170px] sm:max-w-[220px]"
            role="img"
            aria-label="Silueta con el contorno de la primera medición y el de la última"
          >
            <g transform="translate(12, 0)">
              {/* El inicio va debajo: su trazo solo se ve donde sobresale del cuerpo actual. */}
              {compare && <path d={before.path} fill={S.lost} stroke={S.before} strokeWidth={1.2} strokeDasharray="3.5 3" />}
              <path d={after.path} fill={S.fill} stroke={S.stroke} strokeWidth={1.3} strokeLinejoin="round" />
              {/* La cabeza va encima: tapa el tramo del contorno que cruza el cuello y se rodea con su propio trazo. */}
              <ellipse {...after.head} fill={S.fill} stroke={S.stroke} strokeWidth={1.3} />
              {compare && (
                <ellipse cx={after.head.cx} cy={after.head.cy} rx={after.head.rx + 2.5} ry={after.head.ry + 2.5} fill="none" stroke={S.before} strokeWidth={1.2} strokeDasharray="3.5 3" />
              )}
            </g>
            {rows.map((r, i) => {
              const y = LEVEL_Y[r.key]
              const w = after.widths[r.key]
              return (
                <g key={r.key}>
                  <line x1={CX - w} x2={CX + w} y1={y} y2={y} stroke="var(--color-brand)" strokeWidth={1.6} strokeDasharray="1 3.5" strokeLinecap="round" />
                  <circle cx={CX} cy={y} r={8} fill="var(--color-brand)" stroke="#fff" strokeWidth={1.5} />
                  <text x={CX} y={y} dy="0.35em" textAnchor="middle" className="fill-white text-[10px] font-bold">
                    {i + 1}
                  </text>
                </g>
              )
            })}
          </svg>
          {compare && (
            <div className="mt-3 space-y-1 text-xs text-ink-soft">
              <div className="flex items-center gap-2">
                <span className="w-5 border-t-2 border-dashed border-danger" /> Inicio · {fmtDate(firstDate)}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-5 rounded-sm border border-brand bg-[#d6ebdf]" /> Ahora · {fmtDate(lastDate)}
              </div>
            </div>
          )}
        </div>

        {/* KPIs por zona */}
        <ol className="divide-y divide-line self-center">
          {rows.map((r, i) => {
            const { s, changed } = r
            const down = s.delta < 0
            const pct = s.first.value ? (s.delta / s.first.value) * 100 : 0
            return (
              <li key={r.key} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 sm:py-5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] font-semibold">{LABEL[r.key]}</div>
                  <div className="tabular mt-0.5 text-sm">
                    {changed && (
                      <>
                        <span className="text-ink-faint line-through">{fmtNum(s.first.value)}</span>
                        <span className="mx-2 text-ink-faint">→</span>
                      </>
                    )}
                    <span className="font-semibold text-ink">{fmtNum(s.last.value)} cm</span>
                  </div>
                  {/* Barra: tramo claro = inicio, verde = ahora (misma escala para todas las zonas) */}
                  <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
                    {changed && (
                      <div className="absolute inset-y-0 left-0 rounded-full bg-brand-100" style={{ width: `${(s.first.value / scale) * 100}%` }} />
                    )}
                    <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${(s.last.value / scale) * 100}%` }} />
                  </div>
                </div>
                {changed ? (
                  <div className="shrink-0 text-right">
                    <span
                      className={cx(
                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[15px] font-bold whitespace-nowrap',
                        down ? 'bg-brand-50 text-brand-dark' : 'bg-canvas text-ink-soft',
                      )}
                    >
                      {down ? <ArrowDown className="size-4" strokeWidth={2.5} /> : <ArrowUp className="size-4" strokeWidth={2.5} />}
                      {fmtDelta(s.delta)} cm
                    </span>
                    <div className="tabular mt-1 text-xs text-ink-soft">{fmtDelta(pct)} %</div>
                  </div>
                ) : (
                  <span className="shrink-0 text-sm text-ink-soft">{compare ? 'sin cambios' : 'inicio'}</span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {compare && (
        <p className="mt-5 text-xs text-ink-soft">
          Silueta orientativa dibujada a partir de los perímetros medidos.
        </p>
      )}
    </div>
  )
}
