import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Download, Flame, LogOut, Minus, Scale, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { fireConfetti, prefersReducedMotion } from '@/lib/confetti'
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
  bmi,
  bmiCategory,
  type Point,
  type RangeKey,
  type Summary,
} from '@/lib/metrics'
import type { Measurement, MetricKey, ProgressData } from '@/lib/types'
import { LineChart, Sparkline } from '@/components/charts'
import { BodyComparison } from '@/components/BodyComparison'
import { Indicators } from '@/components/Indicators'
import { InstallPrompt } from '@/components/InstallPrompt'
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

        <InstallPrompt />

        {ms.length === 0 ? (
          <Card className="p-8 text-center text-ink-soft">Tu nutricionista todavía no ha registrado mediciones.</Card>
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
              <div className="lg:col-span-5">
                <Hero tall={desktop} ms={ms} weight={weight} />
              </div>
              <div className="lg:col-span-7">
                <MeasuresCard ms={ms} heightCm={data.client.height_cm} />
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

            <div className="grid gap-5 lg:gap-6">
              <Card className="p-5 sm:p-7 lg:p-8">
                <BodyComparison sex={data.client.sex} measurements={ms} title="Tu cuerpo, antes y ahora" />
              </Card>
              <HistoryCard ms={ms} />
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

function MeasuresCard({ ms, heightCm }: { ms: Measurement[]; heightCm: number | null }) {
  const lastWeight = summarize(series(ms, 'weight_kg'))?.last ?? null
  const lastBmi = lastWeight && heightCm ? bmi(lastWeight.value, heightCm) : null
  const rows = METRICS.map((m) => ({ m, s: summarize(series(ms, m.key)) })).filter((r) => r.s)
  const dates = ms.map((m) => m.measured_on)
  const compare = dates.length > 1
  return (
    <Card className="flex h-full flex-col p-5 sm:p-7">
      <h2 className="text-2xl font-bold">Tus medidas</h2>
      {compare && (
        <p className="mt-1 text-ink-soft">
          Tu primera medición ({fmtDateShort(dates[0])}) comparada con la última ({fmtDateShort(dates[dates.length - 1])}).
        </p>
      )}
      <ul className="mt-4 divide-y divide-line">
        {rows.map(({ m, s }) => {
          const changed = compare && s!.first.date !== s!.last.date && s!.delta !== 0
          const down = s!.delta < 0
          return (
            <li key={m.key} className="flex items-center gap-3 py-3.5 sm:gap-4">
              <span
                className={cx(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  !changed ? 'bg-canvas text-ink-faint' : down ? 'bg-brand-50 text-brand' : 'bg-[#eef1f0] text-ink-soft',
                )}
              >
                {!changed ? <Minus className="size-5" /> : down ? <TrendingDown className="size-5" /> : <TrendingUp className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-semibold">{m.label}</div>
                <div className="text-sm text-ink-soft">
                  {changed ? (
                    <>
                      <span className="whitespace-nowrap">
                        {fmtNum(s!.first.value)} <span className="text-ink-faint">→</span>
                      </span>{' '}
                      <span className="font-semibold whitespace-nowrap text-ink">
                        {fmtNum(s!.last.value)} {m.unit}
                      </span>
                    </>
                  ) : (
                    <>
                      {fmtNum(s!.last.value)} {m.unit}
                    </>
                  )}
                </div>
              </div>
              {changed ? (
                <div className="shrink-0 text-right">
                  <div className={cx('font-display text-xl sm:text-2xl font-bold whitespace-nowrap', down ? 'text-brand-dark' : 'text-ink')}>
                    {fmtDelta(s!.delta)} {m.unit}
                  </div>
                  <div className="text-xs whitespace-nowrap text-ink-soft sm:text-sm">
                    {down ? 'has bajado' : 'has subido'} un {fmtNum(Math.abs(s!.pct))} %
                  </div>
                </div>
              ) : (
                <div className="text-sm text-ink-soft">{compare ? 'sin cambios' : 'primera medición'}</div>
              )}
            </li>
          )
        })}
      </ul>
      {lastWeight && (
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-4 rounded-2xl bg-canvas px-4 py-3.5">
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-white text-brand sm:flex">
              <Scale className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold whitespace-nowrap">Tu peso hoy</div>
              <div className="text-sm text-ink-soft">Medido el {fmtDate(lastWeight.date)}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl font-bold whitespace-nowrap">{fmtNum(lastWeight.value)} kg</div>
              {lastBmi != null && (
                <div className="text-sm text-ink-soft">
                  IMC {fmtNum(lastBmi)} · {bmiCategory(lastBmi).label.toLowerCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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

/** Cuenta desde 0 hasta `target` al montar (salvo con "reducir movimiento"). */
function useCountUp(target: number, duration = 1300) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  useEffect(() => {
    if (prefersReducedMotion()) return setValue(target)
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setValue(target * (1 - Math.pow(1 - t, 3)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const v = useCountUp(value)
  return (
    <>
      {fmtNum(v)}
      <span className="ml-1 text-[0.6em] font-semibold text-white/80">{suffix}</span>
    </>
  )
}

function Hero({ ms, weight, tall }: { ms: Measurement[]; weight: Point[]; tall: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const w = summarize(weight)
  const perimeters = PERIMETERS.map((m) => ({ key: m.key, s: summarize(series(ms, m.key)) })).filter(
    (x): x is { key: MetricKey; s: Summary } => x.s !== null && x.s.first.date !== x.s.last.date,
  )
  const totalCm = perimeters.reduce((acc, x) => acc + x.s.delta, 0)
  const best = [...perimeters].sort((a, b) => a.s.delta - b.s.delta)[0]
  const dates = ms.map((m) => m.measured_on)
  const weeks = dates.length > 1 ? weeksBetween(dates[0], dates[dates.length - 1]) : 0

  const wins: { value: number; unit: string; label: string }[] = []
  if (w && weight.length > 1 && w.delta < 0) wins.push({ value: Math.abs(w.delta), unit: 'kg', label: 'menos de peso' })
  if (totalCm <= -0.1) wins.push({ value: Math.abs(totalCm), unit: 'cm', label: 'menos de contorno' })
  const improved = wins.length > 0

  const title = ms.length < 2 ? '¡Buen comienzo!' : improved ? '¡Lo estás consiguiendo!' : '¡Sigue así!'
  const subtitle =
    ms.length < 2
      ? 'Ya tienes tu primera medición. A partir de aquí, cada paso cuenta.'
      : improved
        ? 'Tu constancia está dando resultados. Esto es lo que has logrado:'
        : 'Los cambios llevan su tiempo. Cada medición te acerca a tu objetivo.'

  // Celebración: una vez por sesión y solo si hay logros.
  useEffect(() => {
    if (!improved) return
    const key = `confetti:${dates[dates.length - 1]}`
    try {
      if (sessionStorage.getItem(key)) return
    } catch {
      /* sin almacenamiento: celebramos igualmente */
    }
    // Se marca al disparar (no antes) para que el doble montaje de StrictMode no lo cancele.
    const id = setTimeout(() => {
      try {
        sessionStorage.setItem(key, '1')
      } catch {
        /* ignorar */
      }
      fireConfetti(ref.current)
    }, 450)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [improved])

  return (
    <div ref={ref} className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-brand p-6 text-white sm:p-8">
      <div className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-white/[0.07]" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-white/[0.05]" />

      {weeks > 0 && (
        <span className="relative inline-flex items-center gap-2 self-start rounded-full bg-white/15 py-1.5 pr-4 pl-1.5 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-[#f6c453] text-ink">
            <Flame className="size-4" />
          </span>
          {weeks} {weeks === 1 ? 'semana' : 'semanas'} de constancia
        </span>
      )}

      <button
        type="button"
        onClick={() => improved && fireConfetti(ref.current)}
        className={cx('relative mt-5 text-left', improved ? 'cursor-pointer' : 'cursor-default')}
        tabIndex={improved ? 0 : -1}
        aria-label={improved ? `${title} Pulsa para celebrarlo` : title}
      >
        <h2 className="font-display text-3xl leading-tight font-extrabold sm:text-4xl">{title}</h2>
      </button>
      <p className="relative mt-2 text-white/85">{subtitle}</p>

      {improved && (
        <div className="relative mt-5 grid grid-cols-2 gap-3">
          {wins.map((win) => (
            <div key={win.label} className={cx('rounded-2xl bg-white/12 p-4', wins.length === 1 && 'col-span-2')}>
              <div className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                <CountUp value={win.value} suffix={win.unit} />
              </div>
              <div className="mt-1 text-sm font-medium text-white/85">{win.label}</div>
            </div>
          ))}
          {best && best.s.delta < 0 && perimeters.length > 1 && (
            <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f6c453] text-ink">
                <Trophy className="size-[18px]" />
              </span>
              <span className="text-[15px] leading-snug text-white/90">
                Tu mayor logro: <strong className="text-white">{fmtNum(Math.abs(best.s.delta))} cm</strong> menos en {AREA_NAME[best.key]}
              </span>
            </div>
          )}
        </div>
      )}

      {w && (
        <div className="relative mt-auto pt-6">
          {weight.length > 1 && (
            <Sparkline data={weight} height={tall ? 90 : 56} stroke="rgba(255,255,255,0.85)" fill="rgba(255,255,255,0.08)" />
          )}
          {weight.length > 1 && <p className="mt-2 text-sm text-white/70">Tu evolución de peso</p>}
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
