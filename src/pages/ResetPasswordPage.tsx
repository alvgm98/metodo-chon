import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth'
import { AuthShell } from '@/components/AuthShell'
import { Button, ErrorBox, Field, Input, PageLoader } from '@/components/ui'

export default function ResetPasswordPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <PageLoader />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/clientes', { replace: true })
  }

  return (
    <AuthShell title="Nueva contraseña" intro={session ? 'Elige una contraseña nueva para tu cuenta.' : undefined} footer={<span />}>
      {session ? (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Contraseña nueva" hint="Mínimo 8 caracteres.">
            {(id, d) => (
              <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
          </Field>
          <ErrorBox error={error} />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
            Guardar contraseña
          </Button>
        </form>
      ) : (
        <p className="text-lg text-ink-soft">
          El enlace ha caducado o no es válido. Vuelve a solicitarlo desde la pantalla de acceso.
        </p>
      )}
    </AuthShell>
  )
}
