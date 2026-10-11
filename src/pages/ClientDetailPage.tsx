import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronLeft, Download, Link2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useClient, useDeleteMeasurement, useMeasurements, useProfile } from '@/lib/api'
import { ageFrom, fmtDate, fmtDelta, fmtHeight, fmtNum } from '@/lib/format'
import { METRICS, RANGES, filterRange, metricDef, series, sortMeasurements, summarize, type RangeKey } from '@/lib/metrics'
import type { Measurement, MetricKey } from '@/lib/types'
import { ChartCaption, LineChart } from '@/components/charts'
import { Indicators } from '@/components/Indicators'
import { BodyComparison } from '@/components/BodyComparison'
import { MeasurementModal } from '@/components/MeasurementModal'
import { ShareModal } from '@/components/ShareModal'
import { useDownloadReport } from '@/pdf/useDownloadReport'
import { Avatar, Button, ButtonLink, Card, ConfirmModal, ErrorBox, PageLoader, Segmented, cx, useToast } from '@/components/ui'

export default function ClientDetailPage() {
  const { id } = useParams()
  const toast = useToast()
  const { data: client, isLoading, error } = useClient(id)
  const { data: measurements = [], isLoading: loadingMs } = useMeasurements(id)
  const { data: profile } = useProfile()
  const removeMeasurement = useDeleteMeasurement(id!)
  const { download, busy: pdfBusy } = useDownloadReport()

  const [metric, setMetric] = useState<MetricKey>('weight_kg')
  const [range, setRange] = useState<RangeKey>('all')
  const [modal, setModal] = useState<{ editing: Measurement | null } | null>(null)
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState<Measurement | null>(null)

  const sorted = useMemo(() => sortMeasurements(measurements), [measurements])
  const history = useMemo(() => [...sorted].reverse(), [sorted])
  const chartData = useMemo(() => filterRange(series(sorted, metric), range), [sorted, metric, range])

  if (isLoading || loadingMs) return <PageLoader />
  if (error || !client) return <ErrorBox error={error ?? 'Cliente no encontrado'} />

  const def = metricDef(metric)
  const age = ageFrom(client.birth_date)
  const since = [client.created_at.slice(0, 10), sorted[0]?.measured_on].filter(Boolean).sort()[0]!
  const last = history[0] ?? null

  const meta = [
    `DNI ${client.dni}`,
    [client.sex === 'female' ? 'Mujer' : 'Hombre', age != null && `${age} años`].filter(Boolean).join(' · '),
    fmtHeight(client.height_cm),
    client.goal && `Objetivo: ${client.goal.toLowerCase()}`,
    `Cliente desde el ${fmtDate(since)}`,
  ].filter(Boolean) as string[]

  return (
    <div>
      <Link to="/clientes" className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline">
        <ChevronLeft className="size-5" /> Clientes
      </Link>

      <header className="mt-6 flex flex-col gap-5 sm:mt-8 sm:flex-row sm:items-center">
        <Avatar name={client.full_name} size="xl" tone="solid" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold sm:text-[44px] sm:leading-tight">{client.full_name}</h1>
          <p className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-ink-soft">
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </p>
        </div>
      </header>

      <div className="mt-7 flex flex-wrap gap-3">
        <Button icon={<Link2 className="size-4" />} onClick={() => setSharing(true)}>
          Compartir enlace
        </Button>
        <Button
          icon={<Download className="size-4" />}
          loading={pdfBusy}
          disabled={sorted.length === 0}
          onClick={() =>
            download({ client, professional: profile ?? null, measurements: sorted }).then((ok) => ok && toast('Informe descargado'))
          }
        >
          Descargar PDF
        </Button>
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setModal({ editing: null })}>
          Nueva medición
        </Button>
        <ButtonLink to={`/clientes/${client.id}/editar`} variant="ghost" icon={<Pencil className="size-4" />} className="sm:ml-auto">
          Editar ficha
        </ButtonLink>
      </div>

      {sorted.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">Sin mediciones todavía</h2>
          <p className="mt-2 max-w-md text-ink-soft">
            Registra la primera medición para empezar a ver su evolución, generar el informe y compartir su progreso.
          </p>
          <Button variant="primary" className="mt-6" icon={<Plus className="size-4" />} onClick={() => setModal({ editing: null })}>
            Añadir primera medición
          </Button>
        </Card>
      ) : (
        <>
          {/* KPIs: también seleccionan la gráfica */}
          <div role="tablist" aria-label="Medida a mostrar" className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
            {METRICS.map((m) => {
              const s = summarize(series(sorted, m.key))
              const selected = metric === m.key
              return (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setMetric(m.key)}
                  className={cx(
                    'rounded-2xl border p-4 text-left transition-all sm:p-5',
                    m.key === 'weight_kg' && 'col-span-2 md:col-span-1',
                    selected ? 'border-brand bg-brand text-white shadow-md' : 'border-line bg-white hover:border-line-strong',
                  )}
                >
                  <div className={cx('eyebrow', selected && 'text-white/85')}>{m.label}</div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-display text-3xl font-bold tracking-tight sm:text-[34px]">{fmtNum(s?.last.value)}</span>
                    <span className={cx('text-sm', selected ? 'text-white/85' : 'text-ink-soft')}>{m.unit}</span>
                  </div>
                  {s && s.first.date !== s.last.date && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs sm:text-[13px]">
                      <span
                        className={cx(
                          'rounded-full px-2.5 py-1 font-semibold whitespace-nowrap',
                          selected ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-dark',
                        )}
                      >
                        {fmtDelta(s.delta)} {m.unit}
                      </span>
                      <span className={selected ? 'text-white/80' : 'text-ink-soft'}>desde el inicio</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <Card className="mt-6 p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Evolución · {def.label}</h2>
                <p className="mt-1 text-ink-soft">
                  <ChartCaption points={chartData} unit={def.unit} />
                </p>
              </div>
              <Segmented value={range} onChange={setRange} options={RANGES} label="Periodo" />
            </div>
            <div className="mt-6">
              <LineChart data={chartData} unit={def.unit} label={def.label} height={380} />
            </div>
          </Card>

          <div className="mt-6">
            <Indicators measurements={sorted} heightCm={client.height_cm} sex={client.sex} />
          </div>

          <Card className="mt-6 p-5 sm:p-8">
            <h2 className="text-2xl font-bold">Perímetros · antes y ahora</h2>
            <p className="mt-0.5 mb-4 text-ink-soft">Silueta orientativa generada a partir de la primera y la última medición.</p>
            <div className="mx-auto max-w-2xl">
              <BodyComparison sex={client.sex} measurements={sorted} />
            </div>
          </Card>

          <Card className="mt-6 overflow-hidden">
            <div className="flex items-baseline justify-between px-5 pt-6 pb-3 sm:px-8">
              <h2 className="text-2xl font-bold">Historial de mediciones</h2>
              <span className="text-ink-soft">
                {sorted.length} {sorted.length === 1 ? 'medición' : 'mediciones'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="eyebrow border-b border-line">
                    <th className="py-4 pl-5 font-semibold sm:pl-8">Fecha</th>
                    {METRICS.map((m) => (
                      <th key={m.key} className="py-4 pr-4 text-right font-semibold">
                        {m.label} ({m.unit})
                      </th>
                    ))}
                    <th className="py-4 pr-5 sm:pr-8">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                      <td className="py-3.5 pl-5 font-medium whitespace-nowrap sm:pl-8">{fmtDate(row.measured_on)}</td>
                      {METRICS.map((m) => (
                        <td key={m.key} className={cx('tabular py-3.5 pr-4 text-right', m.key === 'weight_kg' && 'font-semibold')}>
                          {fmtNum(row[m.key])}
                        </td>
                      ))}
                      <td className="py-2 pr-3 text-right whitespace-nowrap sm:pr-6">
                        <button
                          type="button"
                          onClick={() => setModal({ editing: row })}
                          className="rounded-lg p-2.5 text-ink-soft hover:bg-white hover:text-ink"
                          aria-label={`Editar medición del ${fmtDate(row.measured_on)}`}
                        >
                          <Pencil className="size-[18px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(row)}
                          className="rounded-lg p-2.5 text-ink-soft hover:bg-danger-bg hover:text-danger"
                          aria-label={`Eliminar medición del ${fmtDate(row.measured_on)}`}
                        >
                          <Trash2 className="size-[18px]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <MeasurementModal
        open={modal !== null}
        onClose={() => setModal(null)}
        clientId={client.id}
        editing={modal?.editing ?? null}
        previous={last}
      />
      <ShareModal open={sharing} onClose={() => setSharing(false)} client={client} />
      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        loading={removeMeasurement.isPending}
        title="¿Eliminar esta medición?"
        description={deleting && <>Se borrará la medición del {fmtDate(deleting.measured_on)}. No se puede deshacer.</>}
        onConfirm={async () => {
          await removeMeasurement.mutateAsync(deleting!.id)
          setDeleting(null)
          toast('Medición eliminada')
        }}
      />
    </div>
  )
}
