import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { useClient, useDeleteClient, useSaveClient } from '@/lib/api'
import { isValidDni, normalizeDni } from '@/lib/dni'
import { todayIso } from '@/lib/format'
import type { ClientInput, Sex } from '@/lib/types'
import { GOALS } from '@/config'
import { Button, ButtonLink, Card, ConfirmModal, ErrorBox, Field, Input, PageLoader, Select, Textarea, cx, useToast } from '@/components/ui'

const EMPTY: ClientInput = {
  full_name: '',
  dni: '',
  birth_date: null,
  sex: 'female',
  height_cm: null,
  goal: GOALS[0],
  notes: '',
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-6 sm:p-10">
      <h2 className="mb-7 text-2xl font-bold">{title}</h2>
      {children}
    </Card>
  )
}

export default function ClientFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { data: client, isLoading } = useClient(id)
  const save = useSaveClient()
  const remove = useDeleteClient()
  const [form, setForm] = useState<ClientInput>(EMPTY)
  const [heightText, setHeightText] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof ClientInput, string>>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (client) {
      setForm({
        full_name: client.full_name,
        dni: client.dni,
        birth_date: client.birth_date,
        sex: client.sex,
        height_cm: client.height_cm,
        goal: client.goal,
        notes: client.notes ?? '',
      })
      setHeightText(client.height_cm != null ? String(client.height_cm).replace('.', ',') : '')
    }
  }, [client])

  const set = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.full_name.trim()) e.full_name = 'Escribe el nombre y apellidos.'
    if (form.dni?.trim() && !isValidDni(form.dni)) e.dni = 'DNI/NIE no válido: revisa los números y la letra, o déjalo vacío.'
    const h = heightText.trim() ? Number(heightText.replace(',', '.')) : null
    if (h != null && (Number.isNaN(h) || h < 50 || h > 250)) e.height_cm = 'Introduce la altura en centímetros (p. ej. 165).'
    if (form.birth_date && form.birth_date > todayIso()) e.birth_date = 'La fecha no puede ser futura.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    const h = heightText.trim() ? Math.round(Number(heightText.replace(',', '.')) * 10) / 10 : null
    const saved = await save.mutateAsync({
      id,
      input: { ...form, full_name: form.full_name.trim(), dni: (form.dni && normalizeDni(form.dni)) || null, height_cm: h, notes: form.notes?.trim() || null },
    }).catch(() => null)
    if (saved) {
      toast(isEdit ? 'Ficha actualizada' : 'Ficha creada')
      navigate(`/clientes/${saved.id}`, { replace: true })
    }
  }

  async function onDelete() {
    await remove.mutateAsync(id!)
    toast('Cliente eliminado')
    navigate('/clientes', { replace: true })
  }

  if (isEdit && isLoading) return <PageLoader />

  const backTo = isEdit ? `/clientes/${id}` : '/clientes'
  const goals = form.goal && !GOALS.includes(form.goal as (typeof GOALS)[number]) ? [...GOALS, form.goal] : GOALS

  return (
    <div className="max-w-[1060px]">
      <Link to={backTo} className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline">
        <ChevronLeft className="size-5" /> {isEdit ? client?.full_name : 'Clientes'}
      </Link>
      <h1 className="mt-6 text-4xl font-extrabold sm:mt-10 sm:text-5xl">{isEdit ? 'Editar ficha' : 'Nuevo cliente'}</h1>
      <p className="mt-3 text-ink-soft sm:text-lg">
        {isEdit
          ? 'Actualiza los datos del cliente. Las mediciones se gestionan desde su ficha.'
          : 'Con estos datos se crea su ficha. Las mediciones se añaden después, desde la propia ficha.'}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
        <Section title="Datos personales">
          <div className="grid gap-6">
            <Field label="Nombre y apellidos" error={errors.full_name}>
              {(fid, d) => (
                <Input id={fid} aria-describedby={d} aria-invalid={!!errors.full_name} autoComplete="off" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
              )}
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                label={<>DNI / NIE <span className="font-normal text-ink-faint">(opcional)</span></>}
                hint="Es la clave de acceso a su portal: sin DNI no podrá ver su progreso."
                error={errors.dni}
              >
                {(fid, d) => (
                  <Input
                    id={fid}
                    aria-describedby={d}
                    aria-invalid={!!errors.dni}
                    className="font-mono tracking-[0.12em] uppercase"
                    placeholder="12345678Z"
                    autoComplete="off"
                    maxLength={12}
                    value={form.dni ?? ''}
                    onChange={(e) => set('dni', e.target.value.toUpperCase())}
                    onBlur={() => form.dni && set('dni', normalizeDni(form.dni))}
                  />
                )}
              </Field>
              <Field label="Fecha de nacimiento" hint="Se usa para calcular la edad." error={errors.birth_date}>
                {(fid, d) => (
                  <Input
                    id={fid}
                    type="date"
                    aria-describedby={d}
                    max={todayIso()}
                    value={form.birth_date ?? ''}
                    onChange={(e) => set('birth_date', e.target.value || null)}
                  />
                )}
              </Field>
            </div>
            <Field label="Objetivo">
              {(fid) => (
                <Select id={fid} value={form.goal ?? ''} onChange={(e) => set('goal', e.target.value || null)}>
                  <option value="">Sin especificar</option>
                  {goals.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </Section>

        <Section title="Datos físicos">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <span className="mb-2 block text-[15px] font-semibold">Sexo</span>
              <div role="radiogroup" aria-label="Sexo" className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['female', 'Mujer'],
                    ['male', 'Hombre'],
                  ] as [Sex, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={form.sex === value}
                    onClick={() => set('sex', value)}
                    className={cx(
                      'h-12 rounded-xl border text-[16px] font-semibold transition-colors',
                      form.sex === value ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-line-strong',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-sm text-ink-soft">Para la silueta del informe y los valores de referencia del ICC.</p>
            </div>
            <Field label="Altura" hint="Necesaria para calcular el IMC." error={errors.height_cm}>
              {(fid, d) => (
                <Input
                  id={fid}
                  aria-describedby={d}
                  aria-invalid={!!errors.height_cm}
                  inputMode="decimal"
                  placeholder="165"
                  suffix="cm"
                  value={heightText}
                  onChange={(e) => {
                    setHeightText(e.target.value.replace(/[^0-9.,]/g, ''))
                    setErrors((er) => ({ ...er, height_cm: undefined }))
                  }}
                />
              )}
            </Field>
          </div>
        </Section>

        <Section title="Observaciones">
          <Field label={<span className="sr-only">Observaciones</span>} hint="Solo las ves tú; no aparecen en el portal del cliente.">
            {(fid, d) => (
              <Textarea
                id={fid}
                aria-describedby={d}
                rows={6}
                placeholder="Alergias, intolerancias, medicación, hábitos, objetivos…"
                value={form.notes ?? ''}
                onChange={(e) => set('notes', e.target.value)}
              />
            )}
          </Field>
        </Section>

        <ErrorBox error={save.error} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {isEdit && (
            <Button variant="ghost" className="text-danger hover:bg-danger-bg hover:text-danger sm:mr-auto" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
              Eliminar cliente
            </Button>
          )}
          <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row">
            <ButtonLink to={backTo} size="lg">Cancelar</ButtonLink>
            <Button type="submit" variant="primary" size="lg" loading={save.isPending}>
              {isEdit ? 'Guardar cambios' : 'Crear ficha'}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        loading={remove.isPending}
        title="¿Eliminar este cliente?"
        description={<>Se borrarán su ficha y todas sus mediciones. Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar definitivamente"
      />
    </div>
  )
}
