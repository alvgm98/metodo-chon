import { useRouteError } from 'react-router'
import { RefreshCw } from 'lucide-react'
import { isChunkLoadError } from '@/lib/chunks'
import { Button, ButtonLink, Logo } from '@/components/ui'

/** Sustituye la pantalla técnica "Unexpected Application Error!" de React Router. */
export function RouteErrorPage() {
  const error = useRouteError()
  const newVersion = isChunkLoadError(error)
  if (!newVersion) console.error(error)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Logo />
      <h1 className="mt-10 text-4xl font-extrabold">{newVersion ? 'Hay una versión nueva' : 'Algo ha ido mal'}</h1>
      <p className="mt-3 text-lg text-ink-soft">
        {newVersion
          ? 'La aplicación se ha actualizado. Recarga la página para seguir.'
          : 'Ha ocurrido un error inesperado. Recarga la página y, si se repite, inténtalo más tarde.'}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="primary" icon={<RefreshCw className="size-4" />} onClick={() => window.location.reload()}>
          Recargar
        </Button>
        {!newVersion && <ButtonLink to="/">Ir al inicio</ButtonLink>}
      </div>
    </div>
  )
}
