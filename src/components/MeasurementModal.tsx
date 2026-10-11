import { useEffect, useState, type FormEvent } from 'react'
import { useSaveMeasurement } from '@/lib/api'
import { fmtNum, todayIso } from '@/lib/format'
import { METRICS } from '@/lib/metrics'
import type { Measurement, MetricKey } from '@/lib/types'
import { Button, ErrorBox, Field, Input, Modal, useToast } from './ui'

type Texts = Record<MetricKey, string>

const toText = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','))
const toNum = (s: string) => (s.trim() === '' ? null : Number(s.trim().replace(',', '.')))

const LIMITS: Record<MetricKey, [number, number]> = {
  weight_kg: [20, 400],
  neck_cm: [15, 80],
  waist_cm: [30, 250],
  navel_cm: [30, 250],
  hip_cm: [40, 250],
}

export function MeasurementModal({
  open,
  onClose,
  clientId,
  editing,
  previous,
}: {
  open: boolean
  onClose: () => void
  clientId: string
  editing: Measurement | null
  /** última medición, para mostrarla como referencia */
  previous: Measurement | null
}) {
  const save = useSaveMeasurement(clientId)
  const toast = useToast()
  const [date, setDate] = useState(todayIso())
  const [values, setValues] = useState<Texts>({ weight_kg: '', neck_cm: '', waist_cm: '', navel_cm: '', hip_cm: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    save.reset()
    setDate(editing?.measured_on ?? todayIso())
    setValues({
      weight_kg: toText(editing?.weight_kg),
      neck_cm: toText(editing?.neck_cm),
      waist_cm: toText(editing?.waist_cm),
      navel_cm: toText(editing?.navel_cm),
      hip_cm: toText(editing?.hip_cm),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!date) return setError('Indica la fecha de la medición.')
    if (date > todayIso()) return setError('La fecha no puede ser futura.')
    const nums = Object.fromEntries(METRICS.map((m) => [m.key, toNum(values[m.key])])) as Record<MetricKey, number | null>
    for (const m of METRICS) {
      const v = nums[m.key]
      if (v == null) continue
      const [lo, hi] = LIMITS[m.key]
      if (Number.isNaN(v) || v < lo || v > hi) return setError(`${m.label}: introduce un valor entre ${lo} y ${hi} ${m.unit}.`)
      nums[m.key] = Math.round(v * 10) / 10
    }
    if (METRICS.every((m) => nums[m.key] == null)) return setError('Introduce al menos una medida.')
    setError(null)
    await save.mutateAsync({ id: editing?.id, input: { measured_on: date, ...nums } })
    toast(editing ? 'Medición actualizada' : 'Medición guardada')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar medición' : 'Nueva medición'}
      description={previous && !editing ? 'Entre paréntesis, el valor de la última medición.' : undefined}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field label="Fecha">
          {(id) => <Input id={id} type="date" required max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          {METRICS.map((m) => (
            <Field
              key={m.key}
              className={m.key === 'weight_kg' ? 'col-span-2' : undefined}
              label={
                <>
                  {m.label}
                  {previous && !editing && previous[m.key] != null && (
                    <span className="ml-1 font-normal text-ink-faint">({fmtNum(previous[m.key])})</span>
                  )}
                </>
              }
            >
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  autoComplete="off"
                  suffix={m.unit}
                  value={values[m.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [m.key]: e.target.value.replace(/[^0-9.,]/g, '') }))}
                />
              )}
            </Field>
          ))}
        </div>
        <ErrorBox error={error ?? save.error} />
        <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>
            {editing ? 'Guardar cambios' : 'Guardar medición'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
