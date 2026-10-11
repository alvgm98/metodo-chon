import { useState } from 'react'
import { Link } from 'react-router'
import { Download, Search } from 'lucide-react'
import { fetchMeasurements, useClients, useProfile } from '@/lib/api'
import { fmtDate, fmtDateRange } from '@/lib/format'
import type { ClientOverview } from '@/lib/types'
import { useDownloadReport } from '@/pdf/useDownloadReport'
import { Avatar, Button, Card, ErrorBox, PageLoader, useToast } from '@/components/ui'

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export default function ReportsPage() {
  const { data: clients, isLoading, error } = useClients()
  const { data: profile } = useProfile()
  const { download } = useDownloadReport()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function onDownload(c: ClientOverview) {
    setBusyId(c.id)
    try {
      const measurements = await fetchMeasurements(c.id)
      if (await download({ client: c, professional: profile ?? null, measurements })) toast('Informe descargado')
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) return <PageLoader />

  const withData = (clients ?? [])
    .filter((c) => c.measurement_count > 0)
    .filter((c) => !query.trim() || fold(c.full_name).includes(fold(query.trim())))
    .sort((a, b) => (b.last_measured_on ?? '').localeCompare(a.last_measured_on ?? ''))

  return (
    <div>
      <h1 className="text-4xl font-extrabold sm:text-5xl">Informes</h1>
      <p className="mt-2 text-ink-soft sm:text-lg">
        Descarga el informe de evolución en PDF de cualquier cliente con mediciones.
      </p>
      <ErrorBox error={error} />

      <label className="relative mt-8 block">
        <span className="sr-only">Buscar cliente</span>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente"
          className="h-14 w-full rounded-2xl border border-line bg-white pr-4 pl-12 text-[16px] placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand/15 focus:outline-none"
        />
      </label>

      <Card className="mt-6 overflow-hidden">
        {withData.length === 0 ? (
          <p className="px-8 py-12 text-center text-ink-soft">No hay clientes con mediciones que coincidan.</p>
        ) : (
          <ul className="divide-y divide-line">
            {withData.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-8">
                <Link to={`/clientes/${c.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <Avatar name={c.full_name} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold hover:underline">{c.full_name}</div>
                    <div className="text-sm text-ink-soft">
                      {c.measurement_count} {c.measurement_count === 1 ? 'medición' : 'mediciones'} ·{' '}
                      {c.first_measured_on === c.last_measured_on
                        ? fmtDate(c.last_measured_on!)
                        : fmtDateRange(c.first_measured_on!, c.last_measured_on!)}
                    </div>
                  </div>
                </Link>
                <Button
                  icon={<Download className="size-4" />}
                  loading={busyId === c.id}
                  disabled={busyId !== null && busyId !== c.id}
                  onClick={() => onDownload(c)}
                >
                  Descargar PDF
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
