import { useMemo, useState } from 'react'
import { ChevronDown, Download, LogOut } from 'lucide-react'
import { fmtDate, fmtDateShort, fmtDelta, fmtNum, firstName } from '@/lib/format'
import {
  METRICS,
  PERIMETERS,
  RANGES,
  filterRange,
  metricDef,
  series,
  sortMeasurements,
  summarize,
  type RangeKey,
} from '@/lib/metrics'
import type { MetricKey, ProgressData } from '@/lib/types'
import { BodySilhouette, LineChart, Sparkline } from '@/components/charts'
import { Indicators } from '@/components/Indicators'
import { useDownloadReport } from '@/pdf/useDownloadReport'
import { Button, Card, Logo, Segmented, cx } from '@/components/ui'

export function PortalProgress({ data, onLogout }: { data: ProgressData; onLogout: () => void }) {
  const ms = useMemo(() => sortMeasurements(data.measurements), [data.measurements])
  const [metric, setMetric] = useState<MetricKey>('weight_kg')
  const [range, setRange] = useState<RangeKey>('all')
  const [showAll, setShowAll] = useState(false)
  const { download, busy } = useDownloadReport()

  const def = metricDef(metric)
  const points = useMemo(() => series(ms, metric), [ms, metric])
  const chartData = useMemo(() => filterRange(points, range), [points, range])
  const chartSum = summarize(chartData)
  const last = ms[ms.length - 1]
  const weight = series(ms, 'weight_kg')
  const weightSum = summarize(weight)

  // Perímetro con mayor reducción, para el titular.
  const bestPerimeter = PERIMETERS.map((m) => ({ m, s: summarize(series(ms, m.key)) }))
    .filter((x) => x.s && x.s.delta < 0)
    .sort((a, b) => a.s!.delta - b.s!.delta)[0]

  const history = [...ms].reverse()
  const visibleHistory = showAll ? history : history.slice(0, 4)

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Logo size="sm" />
          <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 font-semibold text-brand hover:bg-brand-50">
            Salir <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 pt-7 pb-16">
        <div>
          <h1 className="text-4xl font-extrabold">Hola, {firstName(data.client.full_name)}</h1>
          {last && <p className="mt-1 text-ink-soft">Última medición: {fmtDate(last.measured_on)}</p>}
        </div>

        {ms.length === 0 ? (
          <Card className="p-8 text-center text-ink-soft">Tu nutricionista todavía no ha registrado mediciones.</Card>
        ) : (
          <>
            <Hero weightSum={weightSum} weight={weight} best={bestPerimeter ? { key: bestPerimeter.m.key, delta: bestPerimeter.s!.delta } : null} />

            <div role="tablist" aria-label="Medida" className="flex flex-wrap gap-2">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={metric === m.key}
                  onClick={() => setMetric(m.key)}
                  className={cx(
                    'rounded-full border px-4 py-2.5 text-[15px] font-medium transition-colors',
                    metric === m.key ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-line-strong',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <Card className="p-5 sm:p-7">
              <h2 className="text-2xl font-bold">{def.label}</h2>
              {chartSum && chartData.length > 1 && (
                <p className="mt-0.5 text-ink-soft">
                  {fmtDelta(chartSum.delta)} {def.unit} desde el {fmtDateShort(chartSum.first.date)}
                </p>
              )}
              <Segmented value={range} onChange={setRange} options={RANGES} size="lg" className="mt-4 w-full" label="Periodo" />
              <div className="mt-5">
                <LineChart data={chartData} unit={def.unit} label={def.label} height={260} compact />
              </div>
              <p className="mt-3 text-center text-sm text-ink-soft">Toca un punto para ver esa medición</p>
            </Card>

            <Card className="p-5 sm:p-7">
              <h2 className="text-2xl font-bold">Tus medidas</h2>
              <div className="mt-5 space-y-6">
                {METRICS.map((m) => {
                  const s = summarize(series(ms, m.key))
                  if (!s) return null
                  const max = Math.max(s.first.value, s.last.value)
                  return (
                    <div key={m.key}>
                      <div className="flex items-center justify-between">
                        <span className="text-[17px] font-medium">{m.label}</span>
                        {s.first.date !== s.last.date && (
                          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-semibold text-brand-dark">
                            {fmtDelta(s.delta)} {m.unit}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-x-3 gap-y-1.5 text-sm">
                        <span className="text-ink-soft">Inicio</span>
                        <span className="h-2 rounded-full bg-brand-300" style={{ width: `${(s.first.value / max) * 100}%` }} />
                        <span className="tabular text-right text-ink-soft">
                          {fmtNum(s.first.value)} {m.unit}
                        </span>
                        <span className="font-medium">Ahora</span>
                        <span className="h-2 rounded-full bg-brand" style={{ width: `${(s.last.value / max) * 100}%` }} />
                        <span className="tabular text-right font-semibold">
                          {fmtNum(s.last.value)} {m.unit}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Indicators measurements={ms} heightCm={data.client.height_cm} sex={data.client.sex} />

            <Card className="p-5 sm:p-7">
              <h2 className="text-2xl font-bold">Tus perímetros</h2>
              <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <BodySilhouette
                  sex={data.client.sex}
                  className="h-80 w-auto shrink-0"
                  rings={PERIMETERS.map((m) => {
                    const s = summarize(series(ms, m.key))
                    return { key: m.key, first: s && s.first.date !== s.last.date ? s.first.value : null, last: s?.last.value ?? null }
                  })}
                />
                <div className="w-full space-y-3">
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 border-t-2 border-dashed border-danger" /> Primera medición
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 border-t-[3px] border-brand" /> Última medición
                    </span>
                  </div>
                  {PERIMETERS.map((m) => {
                    const s = summarize(series(ms, m.key))
                    if (!s) return null
                    return (
                      <div key={m.key} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
                        <div>
                          <div className="font-semibold">{m.label}</div>
                          <div className="tabular text-sm">
                            <span className="text-danger">{fmtNum(s.first.value)}</span>
                            <span className="mx-1.5 text-ink-faint">→</span>
                            <span className="font-semibold text-brand-dark">{fmtNum(s.last.value)} cm</span>
                          </div>
                        </div>
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-dark">{fmtDelta(s.delta)} cm</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <h2 className="px-5 pt-6 pb-2 text-2xl font-bold sm:px-7">Historial</h2>
              <ul>
                {visibleHistory.map((m) => {
                  const idx = ms.indexOf(m)
                  const prevWeight = ms.slice(0, idx).reverse().find((x) => x.weight_kg != null)?.weight_kg
                  const delta = m.weight_kg != null && prevWeight != null ? m.weight_kg - prevWeight : null
                  return (
                    <li key={m.id} className="border-b border-line last:border-0">
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 sm:px-7">
                          <span className="flex-1 text-[17px] font-medium">{fmtDate(m.measured_on)}</span>
                          {delta != null && <span className="tabular text-sm text-ink-soft">{fmtDelta(delta)} kg</span>}
                          <span className="tabular w-20 text-right text-lg font-bold">{m.weight_kg != null ? `${fmtNum(m.weight_kg)} kg` : '—'}</span>
                          <ChevronDown className="size-4 text-ink-faint transition-transform group-open:rotate-180" />
                        </summary>
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 px-5 pb-4 text-sm sm:px-7">
                          {PERIMETERS.map((p) => (
                            <div key={p.key} className="flex justify-between">
                              <dt className="text-ink-soft">{p.label}</dt>
                              <dd className="tabular font-medium">{m[p.key] != null ? `${fmtNum(m[p.key])} cm` : '—'}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    </li>
                  )
                })}
              </ul>
              {history.length > 4 && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="w-full border-t border-line py-4 font-semibold text-brand hover:bg-brand-50/50">
                  {showAll ? 'Ver menos' : `Ver todas (${history.length})`}
                </button>
              )}
            </Card>

            <Button
              size="lg"
              className="w-full"
              icon={<Download className="size-5" />}
              loading={busy}
              onClick={() => download({ ...data, client: { ...data.client, share_enabled: true } })}
            >
              Descargar informe en PDF
            </Button>
          </>
        )}

        {data.professional?.full_name && (
          <p className="pt-4 text-center text-sm text-ink-soft">
            Tu nutricionista: <span className="font-semibold text-ink">{data.professional.full_name}</span>
            {data.professional.professional_title && ` · ${data.professional.professional_title}`}
          </p>
        )}
      </main>
    </div>
  )
}

function Hero({
  weightSum,
  weight,
  best,
}: {
  weightSum: ReturnType<typeof summarize>
  weight: { date: string; value: number }[]
  best: { key: MetricKey; delta: number } | null
}) {
  if (!weightSum || weight.length < 2) {
    return (
      <div className="rounded-3xl bg-brand p-6 text-white">
        <p className="text-white/85">Ya tienes tu primera medición registrada.</p>
        <p className="mt-2 font-display text-3xl font-bold">¡Buen comienzo!</p>
      </div>
    )
  }
  const lost = weightSum.delta < 0
  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand p-6 text-white sm:p-8">
      <div className="pointer-events-none absolute -right-16 -bottom-24 size-64 rounded-full bg-white/[0.06]" />
      <p className="relative text-white/90">
        Desde el {fmtDate(weightSum.first.date)} has {lost ? 'bajado' : weightSum.delta > 0 ? 'ganado' : 'mantenido'}
      </p>
      <p className="relative mt-1 font-display text-6xl font-extrabold tracking-tight sm:text-7xl">
        {fmtNum(Math.abs(weightSum.delta))} kg
      </p>
      {best && (
        <p className="relative mt-1 text-white/90">
          y {fmtNum(Math.abs(best.delta))} cm en {AREA_NAME[best.key]}
        </p>
      )}
      <Sparkline data={weight} height={56} className="relative mt-5" stroke="rgba(255,255,255,0.75)" fill="transparent" />
    </div>
  )
}

const AREA_NAME: Partial<Record<MetricKey, string>> = {
  neck_cm: 'el cuello',
  waist_cm: 'la cintura',
  navel_cm: 'la zona del ombligo',
  hip_cm: 'la cadera',
}
