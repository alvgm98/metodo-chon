import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, Plus, Search, UserPlus } from 'lucide-react'
import { useClients } from '@/lib/api'
import { normalizeDni } from '@/lib/dni'
import { fmtDate, fmtDelta } from '@/lib/format'
import { reviewStatus } from '@/lib/metrics'
import type { ClientOverview } from '@/lib/types'
import { REVIEW_AFTER_DAYS } from '@/config'
import { Avatar, ButtonLink, Card, ErrorBox, PageLoader, cx } from '@/components/ui'

type Filter = 'all' | 'pending'

function weightDelta(c: ClientOverview): number | null {
  if (c.first_weight_kg == null || c.last_weight_kg == null || c.measurement_count < 2) return null
  return c.last_weight_kg - c.first_weight_kg
}

/** Fecha de la última medición; en ámbar si hace más de REVIEW_AFTER_DAYS días. */
function LastMeasured({ date, pending }: { date: string | null; pending: boolean }) {
  if (!date) return <span className="text-ink-faint">Sin mediciones</span>
  return (
    <span className={cx(pending && 'font-medium text-warn')} title={pending ? `Más de ${REVIEW_AFTER_DAYS} días sin medir` : undefined}>
      {fmtDate(date)}
    </span>
  )
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export default function ClientsPage() {
  const { data: clients, isLoading, error } = useClients()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      (clients ?? [])
        .map((c) => ({ ...c, status: reviewStatus(c.last_measured_on) }))
        .sort((a, b) => (b.last_measured_on ?? '').localeCompare(a.last_measured_on ?? '') || a.full_name.localeCompare(b.full_name)),
    [clients],
  )
  const pendingCount = rows.filter((r) => r.status === 'pending').length

  const visible = rows.filter((r) => {
    if (filter === 'pending' && r.status !== 'pending') return false
    const q = query.trim()
    if (!q) return true
    const dniQuery = normalizeDni(q)
    return fold(r.full_name).includes(fold(q)) || (dniQuery !== '' && (r.dni ?? '').includes(dniQuery))
  })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Clientes</h1>
          <p className="mt-2 text-ink-soft sm:text-lg">
            {rows.length} {rows.length === 1 ? 'cliente' : 'clientes'} · {pendingCount} con revisión pendiente (más de{' '}
            {REVIEW_AFTER_DAYS} días sin medir)
          </p>
        </div>
        <ButtonLink to="/clientes/nuevo" variant="primary" size="lg" icon={<Plus className="size-5" />} className="self-start">
          Nuevo cliente
        </ButtonLink>
      </div>

      <ErrorBox error={error} />

      <div className="mt-8 flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por nombre o DNI</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o DNI"
            className="h-14 w-full rounded-2xl border border-line bg-white pr-4 pl-12 text-[16px] placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand/15 focus:outline-none"
          />
        </label>
        <div className="flex gap-2">
          {(
            [
              ['all', `Todos (${rows.length})`],
              ['pending', `Revisión pendiente (${pendingCount})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cx(
                'h-14 rounded-full border px-5 text-[15px] font-semibold whitespace-nowrap transition-colors',
                filter === key ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-line-strong',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand">
            <UserPlus className="size-7" />
          </span>
          <h2 className="mt-5 text-2xl font-bold">Crea tu primera ficha</h2>
          <p className="mt-2 max-w-sm text-ink-soft">Da de alta a un cliente y empieza a registrar sus mediciones.</p>
          <ButtonLink to="/clientes/nuevo" variant="primary" className="mt-6" icon={<Plus className="size-5" />}>
            Nuevo cliente
          </ButtonLink>
        </Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          {/* Tabla (escritorio) */}
          <table className="hidden w-full text-left md:table">
            <thead>
              <tr className="eyebrow border-b border-line">
                <th className="py-5 pl-8 font-semibold">Cliente</th>
                <th className="py-5 font-semibold">DNI</th>
                <th className="py-5 font-semibold">Última medición</th>
                <th className="py-5 pr-6 text-right font-semibold">Mediciones</th>
                <th className="hidden py-5 pr-6 text-right font-semibold lg:table-cell">Δ Peso</th>
                <th className="py-5 pr-8" />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const delta = weightDelta(c)
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clientes/${c.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas/60"
                  >
                    <td className="py-4 pl-8">
                      <div className="flex items-center gap-4">
                        <Avatar name={c.full_name} />
                        <div>
                          <div className="font-semibold">{c.full_name}</div>
                          {c.goal && <div className="text-sm text-ink-soft">{c.goal}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="tabular py-4 text-ink-soft">{c.dni ?? <span className="text-ink-faint">Sin DNI</span>}</td>
                    <td className="py-4">
                      <LastMeasured date={c.last_measured_on} pending={c.status === 'pending'} />
                    </td>
                    <td className="tabular py-4 pr-6 text-right">{c.measurement_count}</td>
                    <td className="tabular hidden py-4 pr-6 text-right font-semibold lg:table-cell">
                      {delta == null ? '—' : `${fmtDelta(delta)} kg`}
                    </td>
                    <td className="py-4 pr-8 text-right">
                      <Link
                        to={`/clientes/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-xl border border-line px-4 py-2.5 font-semibold text-brand hover:border-brand"
                      >
                        Ver ficha <ChevronRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Lista (móvil) */}
          <ul className="divide-y divide-line md:hidden">
            {visible.map((c) => {
              const delta = weightDelta(c)
              return (
                <li key={c.id}>
                  <Link to={`/clientes/${c.id}`} className="flex items-center gap-3 px-4 py-4 active:bg-canvas">
                    <Avatar name={c.full_name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{c.full_name}</div>
                      <div className="truncate text-sm text-ink-soft">
                        {c.dni ?? 'Sin DNI'} · <LastMeasured date={c.last_measured_on} pending={c.status === 'pending'} />
                        {delta != null && ` · ${fmtDelta(delta)} kg`}
                      </div>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-ink-faint" />
                  </Link>
                </li>
              )
            })}
          </ul>

          {visible.length === 0 && <p className="px-8 py-12 text-center text-ink-soft">Ningún cliente coincide con la búsqueda.</p>}
        </Card>
      )}
    </div>
  )
}
