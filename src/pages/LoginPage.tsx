import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth'
import { AuthShell } from '@/components/AuthShell'
import { Button, ErrorBox, Field, Input, PageLoader, Segmented } from '@/components/ui'

type Mode = 'pro' | 'client'

/** Extrae el código de acceso de una URL pegada (…/p/abc123) o lo devuelve tal cual. */
function extractToken(value: string): string {
  const trimmed = value.trim()
  const match = trimmed.match(/\/p\/([A-Za-z0-9_-]+)/)
  return (match ? match[1] : trimmed).replace(/[^A-Za-z0-9_-]/g, '').toLowerCase()
}

export function LoginPage() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('pro')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (loading) return <PageLoader />
  if (session) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/clientes'} replace />

  async function onPro(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : error.message)
  }

  async function onForgot() {
    if (!email.trim()) {
      setError('Escribe tu email y vuelve a pulsar «¿Has olvidado la contraseña?».')
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/restablecer`,
    })
    setBusy(false)
    if (error) setError(error.message)
    else setInfo('Si el email existe, te hemos enviado un enlace para crear una contraseña nueva.')
  }

  function onClient(e: FormEvent) {
    e.preventDefault()
    const token = extractToken(code)
    if (token.length < 6) {
      setError('Pega el enlace o escribe el código que te ha dado tu nutricionista.')
      return
    }
    navigate(`/p/${token}`)
  }

  return (
    <AuthShell
      title={mode === 'pro' ? <>Hola de nuevo.</> : <>Tu progreso,<br />a la vista.</>}
      intro={
        mode === 'pro'
          ? 'Accede a las fichas y mediciones de tus clientes.'
          : 'Usa el enlace o el código que te ha compartido tu nutricionista.'
      }
      footer={mode === 'pro' ? <span /> : undefined}
    >
      <Segmented
        size="lg"
        className="mb-8 w-full"
        label="Tipo de acceso"
        value={mode}
        onChange={(m) => {
          setMode(m)
          setError(null)
          setInfo(null)
        }}
        options={[
          { key: 'pro', label: 'Profesional' },
          { key: 'client', label: 'Cliente' },
        ]}
      />

      {mode === 'pro' ? (
        <form onSubmit={onPro} className="space-y-5">
          <Field label="Email">
            {(id) => (
              <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
          </Field>
          <Field label="Contraseña">
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <ErrorBox error={error} />
          {info && <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-dark">{info}</div>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
            Entrar <ArrowRight className="size-5" />
          </Button>
          <button type="button" onClick={onForgot} className="w-full text-center text-[15px] font-medium text-brand hover:underline">
            ¿Has olvidado la contraseña?
          </button>
        </form>
      ) : (
        <form onSubmit={onClient} className="space-y-5">
          <Field label="Enlace o código de acceso" hint="Lo encontrarás en el mensaje o en el informe PDF de tu nutricionista.">
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="p. ej. 7f3k9qmx2abc"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            )}
          </Field>
          <ErrorBox error={error} />
          <Button type="submit" variant="primary" size="lg" className="w-full">
            Continuar <ArrowRight className="size-5" />
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
