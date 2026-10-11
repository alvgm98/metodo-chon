import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { getPortalInfo, getPortalProgress } from '@/lib/api'
import { normalizeDni } from '@/lib/dni'
import type { ProgressData } from '@/lib/types'
import { AuthShell } from '@/components/AuthShell'
import { Button, ButtonLink, ErrorBox, Logo, PageLoader } from '@/components/ui'
import { PortalProgress } from './PortalProgress'

const storageKey = (token: string) => `portal:${token}`

function readStored(token: string): string | null {
  try {
    return sessionStorage.getItem(storageKey(token))
  } catch {
    return null
  }
}

function store(token: string, dni: string | null) {
  try {
    if (dni) sessionStorage.setItem(storageKey(token), dni)
    else sessionStorage.removeItem(storageKey(token))
  } catch {
    /* modo privado: simplemente no se recuerda */
  }
}

export default function PortalPage() {
  const { token = '' } = useParams()
  const info = useQuery({ queryKey: ['portal-info', token], queryFn: () => getPortalInfo(token), retry: false })
  const [data, setData] = useState<ProgressData | null>(null)
  const [dni, setDni] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(() => Boolean(readStored(token)))

  async function login(value: string, silent = false) {
    setBusy(true)
    setError(null)
    try {
      const res = await getPortalProgress(token, value)
      if ('error' in res) {
        store(token, null)
        if (!silent)
          setError(
            res.error === 'too_many_attempts'
              ? 'Demasiados intentos fallidos. Espera 15 minutos y vuelve a probar.'
              : 'El DNI no coincide con este enlace. Revisa los números y la letra.',
          )
        return
      }
      store(token, normalizeDni(value))
      setData(res)
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'No se ha podido conectar.')
    } finally {
      setBusy(false)
    }
  }

  // Si ya entró en esta pestaña, recupera la sesión sin volver a pedir el DNI.
  useEffect(() => {
    const saved = readStored(token)
    if (saved) login(saved, true).finally(() => setRestoring(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function logout() {
    store(token, null)
    setData(null)
    setDni('')
  }

  if (info.isLoading || restoring) return <PageLoader />

  if (data) return <PortalProgress data={data} onLogout={logout} />

  if (!info.data) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <Logo />
        <h1 className="mt-10 text-4xl font-extrabold">Enlace no disponible</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Este enlace no existe o tu nutricionista lo ha desactivado. Pídele que te envíe uno nuevo.
        </p>
        <ErrorBox error={info.error} />
        <ButtonLink to="/login" className="mt-8 self-start">
          Ir al acceso
        </ButtonLink>
      </div>
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (normalizeDni(dni).length < 9) {
      setError('Escribe los 8 números y la letra.')
      return
    }
    login(dni)
  }

  return (
    <AuthShell
      title={
        <>
          Tu progreso,
          <br />a la vista.
        </>
      }
      intro={
        <>
          {info.data.professional_name || 'Tu nutricionista'} ha compartido contigo la evolución de tus mediciones. Escribe tu
          DNI para verla.
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="dni" className="mb-3 block text-lg font-semibold">
          DNI o NIE
        </label>
        <input
          id="dni"
          value={dni}
          onChange={(e) => {
            setDni(e.target.value.toUpperCase())
            setError(null)
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          placeholder="12345678Z"
          aria-describedby="dni-hint"
          className="h-16 w-full rounded-2xl border border-line bg-white px-5 font-mono text-2xl tracking-[0.18em] text-ink placeholder:text-ink-faint/60 focus:border-brand focus:ring-3 focus:ring-brand/15 focus:outline-none"
        />
        <p id="dni-hint" className="mt-2.5 text-ink-soft">
          8 números y la letra, sin espacios.
        </p>
        <div className="mt-5">
          <ErrorBox error={error} />
        </div>
        <Button type="submit" variant="primary" size="lg" className="mt-5 w-full" loading={busy}>
          Ver mi progreso <ArrowRight className="size-5" />
        </Button>
      </form>
    </AuthShell>
  )
}
