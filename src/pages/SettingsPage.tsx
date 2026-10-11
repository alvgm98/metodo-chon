import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile, useUpdateProfile } from '@/lib/api'
import type { Profile } from '@/lib/types'
import { Button, Card, ErrorBox, Field, Input, PageLoader, useToast } from '@/components/ui'

export default function SettingsPage() {
  const { data: profile, isLoading, error } = useProfile()
  const update = useUpdateProfile()
  const toast = useToast()
  const [form, setForm] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) setForm(profile)
  }, [profile])
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  if (isLoading || !form) return error ? <ErrorBox error={error} /> : <PageLoader />

  async function onSave(e: FormEvent) {
    e.preventDefault()
    await update.mutateAsync({
      ...form!,
      full_name: form!.full_name.trim(),
      professional_title: form!.professional_title.trim(),
      license_number: form!.license_number?.trim() || null,
    })
    toast('Perfil guardado')
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setPwError('Mínimo 8 caracteres.')
    setPwBusy(true)
    setPwError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setPwBusy(false)
    if (error) setPwError(error.message)
    else {
      setPassword('')
      toast('Contraseña actualizada')
    }
  }

  return (
    <div className="max-w-[860px]">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Ajustes</h1>
      <p className="mt-2 text-ink-soft sm:text-lg">Estos datos aparecen en los informes PDF y en el portal de tus clientes.</p>

      <Card className="mt-8 p-6 sm:p-10">
        <h2 className="mb-7 text-2xl font-bold">Perfil profesional</h2>
        <form onSubmit={onSave} className="grid gap-6">
          <Field label="Nombre y apellidos">
            {(id) => <Input id={id} required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />}
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Profesión">
              {(id) => (
                <Input id={id} value={form.professional_title} onChange={(e) => setForm({ ...form, professional_title: e.target.value })} />
              )}
            </Field>
            <Field label="Nº de colegiada" hint="Opcional. Se muestra en el informe.">
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  value={form.license_number ?? ''}
                  onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                />
              )}
            </Field>
          </div>
          <ErrorBox error={update.error} />
          <div>
            <Button type="submit" variant="primary" loading={update.isPending}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6 p-6 sm:p-10">
        <h2 className="mb-2 text-2xl font-bold">Acceso</h2>
        <p className="mb-7 text-ink-soft">
          Cuenta: <span className="font-medium text-ink">{email}</span>
        </p>
        <form onSubmit={onPassword} className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Contraseña nueva" error={pwError}>
            {(id, d) => (
              <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
          </Field>
          <Button type="submit" loading={pwBusy} className="sm:mb-[2px]" size="lg">
            Cambiar contraseña
          </Button>
        </form>
      </Card>
    </div>
  )
}
