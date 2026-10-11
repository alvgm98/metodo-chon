import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Download, LogOut, TrendingDown, TrendingUp } from 'lucide-react'
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
  weeksBetween,
  type Point,
  type RangeKey,
  type Summary,
} from '@/lib/metrics'
import type { Measurement, MetricKey, ProgressData } from '@/lib/types'
import { LineChart, Sparkline } from '@/components/charts'
import { BodyComparison } from '@/components/BodyComparison'
import { Indicators } from '@/components/Indicators'
import { useDownloadReport } from '@/pdf/useDownloadReport'
import { Button, Card, Logo, Segmented, cx } from '@/components/ui'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const on = () => setMatches(mql.matches)
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [query])
  return matches
}

export function PortalProgress({ data, onLogout }: { data: ProgressData; onLogout: () => void }) {
  const ms = useMemo(() => sortMeasurements(data.measurements), [data.measurements])
  const [metric, setMetric] = useState<MetricKey>('weight_kg')
  const [range, setRange] = useState<RangeKey>('all')
  const { download, busy } = useDownloadReport()
  const desktop = useMediaQuery('(min-width: 1024px)')

  const def = metricDef(metric)
  const points = useMemo(() => series(ms, metric), [ms, metric])
  const chartData = useMemo(() => filterRange(points, range), [points, range])
  const chartSum = summarize(chartData)
  const last = ms[ms.length - 1]
  const weight = useMemo(() => series(ms, 'weight_kg'), [ms])

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 lg:px-8">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            {ms.length > 0 && (
              <span className="hidden sm:block">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Download className="size-4" />}
                  loading={busy}
                  onClick={() => download({ ...data, client: { ...data.client, share_enabled: true } })}
                >
                  Descargar PDF
                </Button>
              </span>
            )}
            <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 font-semibold text-brand hover:bg-brand-50">
              Salir <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-5 pt-7 pb-16 lg:space-y-6 lg:px-8 lg:pt-10">
        <div>
          <h1 className="text-4xl font-extrabold lg:text-5xl">Hola, {firstName(data.client.full_name)}</h1>
          {last && <p className="mt-1 text-ink-soft lg:text-lg">Última medición: {fmtDate(last.measured_on)}</p>}
        </div>

        {ms.length === 0 ? (
          <Card className="p-8 text-center text-ink-soft">Tu nutricionista todavía no ha registrado mediciones.</Card>
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
              <div className="lg:col-span-5">
                <Hero tall={desktop} ms={ms} weight={weight} />
              </div>
              <div className="lg:col-span-7">
                <MeasuresCard ms={ms} />
              </div>
            </div>

            <Card className="p-5 sm:p-7 lg:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Evolución · {def.label}</h2>
                  <p className="mt-0.5 text-ink-soft">
                    {chartSum && chartData.length > 1
                      ? `${fmtDelta(chartSum.delta)} ${def.unit} desde el ${fmtDateShort(chartSum.first.date)}`
                      : 'Toca o pasa el ratón por un punto para ver esa medición'}
                  </p>
                </div>
                <Segmented value={range} onChange={setRange} options={RANGES} size={desktop ? 'sm' : 'lg'} className="w-full lg:w-auto" label="Periodo" />
              </div>
              <div role="tablist" aria-label="Medida" className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    role="tab"
                    aria-selected={metric === m.key}
                    onClick={() => setMetric(m.key)}
                    className={cx(
                      'shrink-0 rounded-full border px-4 py-2 text-[15px] font-medium whitespace-nowrap transition-colors',
                      metric === m.key ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-line-strong',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <LineChart data={chartData} unit={def.unit} label={def.label} height={desktop ? 380 : 300} compact={!desktop} />
              </div>
            </Card>

            <Indicators measurements={ms} heightCm={data.client.height_cm} sex={data.client.sex} />

            <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
              <Card className="p-5 sm:p-7 lg:col-span-7 lg:p-8">
                <h2 className="text-2xl font-bold">Tu cuerpo, antes y ahora</h2>
                <p className="mt-0.5 mb-4 text-ink-soft">Silueta orientativa dibujada a partir de tus perímetros.</p>
                <BodyComparison sex={data.client.sex} measurements={ms} />
              </Card>
              <div className="lg:col-span-5">
                <HistoryCard ms={ms} />
              </div>
            </div>

            <Button
              size="lg"
              className="w-full sm:hidden"
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

function MeasuresCard({ ms }: { ms: Measurement[] }) {
  return (
    <Card className="h-full p-5 sm:p-7">
      <h2 className="text-2xl font-bold">Tus medidas</h2>
      <div className="mt-5 space-y-5">
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
  )
}

function HistoryCard({ ms }: { ms: Measurement[] }) {
  const [showAll, setShowAll] = useState(false)
  const history = [...ms].reverse()
  const visible = showAll ? history : history.slice(0, 6)
  return (
    <Card className="h-full overflow-hidden">
      <h2 className="px-5 pt-6 pb-2 text-2xl font-bold sm:px-7">Historial</h2>
      <ul>
        {visible.map((m) => {
          const idx = ms.indexOf(m)
          const prevWeight = ms.slice(0, idx).reverse().find((x) => x.weight_kg != null)?.weight_kg
          const delta = m.weight_kg != null && prevWeight != null ? m.weight_kg - prevWeight : null
          return (
            <li key={m.id} className="border-b border-line last:border-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 hover:bg-canvas/60 sm:px-7">
                  <span className="flex-1 text-[16px] font-medium">{fmtDate(m.measured_on)}</span>
                  {delta != null && <span className="tabular text-sm text-ink-soft">{fmtDelta(delta)} kg</span>}
                  <span className="tabular w-20 text-right text-[17px] font-bold">{m.weight_kg != null ? `${fmtNum(m.weight_kg)} kg` : '—'}</span>
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
      {history.length > 6 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="w-full border-t border-line py-4 font-semibold text-brand hover:bg-brand-50/50">
          {showAll ? 'Ver menos' : `Ver todas (${history.length})`}
        </button>
      )}
    </Card>
  )
}

function Hero({ ms, weight, tall }: { ms: Measurement[]; weight: Point[]; tall: boolean }) {
  const w = summarize(weight)
  const perimeters = PERIMETERS.map((m) => ({ key: m.key, s: summarize(series(ms, m.key)) })).filter(
    (x): x is { key: MetricKey; s: Summary } => x.s !== null && x.s.first.date !== x.s.last.date,
  )
  const totalCm = perimeters.reduce((acc, x) => acc + x.s.delta, 0)
  const best = [...perimeters].sort((a, b) => a.s.delta - b.s.delta)[0]

  const lines: { icon: 'down' | 'up'; text: string }[] = []
  if (w && weight.length > 1 && w.delta !== 0) {
    lines.push({
      icon: w.delta < 0 ? 'down' : 'up',
      text: `${fmtNum(Math.abs(w.delta))} kg ${w.delta < 0 ? 'menos' : 'más'} que el ${fmtDate(w.first.date)}`,
    })
  }
  if (perimeters.length && Math.abs(totalCm) >= 0.1) {
    lines.push({
      icon: totalCm < 0 ? 'down' : 'up',
      text: `${fmtNum(Math.abs(totalCm))} cm ${totalCm < 0 ? 'menos' : 'más'} sumando tus perímetros`,
    })
  }
  if (best && best.s.delta < 0 && perimeters.length > 1) {
    lines.push({ icon: 'down', text: `El mayor cambio: ${fmtNum(Math.abs(best.s.delta))} cm en ${AREA_NAME[best.key]}` })
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-brand p-6 text-white sm:p-8">
      <div className="pointer-events-none absolute -right-16 -bottom-24 size-64 rounded-full bg-white/[0.06]" />
      <p className="relative font-medium text-white/85">Tu peso actual</p>
      {w ? (
        <>
          <p className="relative mt-1 font-display text-6xl font-extrabold tracking-tight sm:text-7xl">
            {fmtNum(w.last.value)}
            <span className="ml-2 text-3xl font-bold text-white/80 sm:text-4xl">kg</span>
          </p>
          <p className="relative mt-1 text-sm text-white/75">Medido el {fmtDate(w.last.date)}</p>
        </>
      ) : (
        <p className="relative mt-2 font-display text-3xl font-bold">Sin registro de peso</p>
      )}

      {lines.length > 0 ? (
        <ul className="relative mt-6 space-y-2.5">
          {lines.map((l) => (
            <li key={l.text} className="flex items-start gap-3 text-[15px] leading-snug sm:text-base">
              <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                {l.icon === 'down' ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
              </span>
              {l.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="relative mt-6 text-white/85">Ya tienes tu primera medición registrada. ¡Buen comienzo!</p>
      )}

      {weight.length > 1 && (
        <div className="relative mt-auto pt-6">
          <Sparkline data={weight} height={tall ? 110 : 56} stroke="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.08)" />
          <p className="mt-2 text-xs text-white/65">
            {ms.length} mediciones · {weeksBetween(weight[0].date, weight[weight.length - 1].date)} semanas
          </p>
        </div>
      )}
    </div>
  )
}

const AREA_NAME: Partial<Record<MetricKey, string>> = {
  neck_cm: 'el cuello',
  waist_cm: 'la cintura',
  navel_cm: 'la zona del ombligo',
  hip_cm: 'la cadera',
}
