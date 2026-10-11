import { ButtonLink, Logo } from '@/components/ui'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Logo />
      <h1 className="mt-10 text-4xl font-extrabold">Página no encontrada</h1>
      <p className="mt-3 text-lg text-ink-soft">El enlace no existe o ha cambiado.</p>
      <ButtonLink to="/" variant="primary" className="mt-8 self-start">
        Ir al inicio
      </ButtonLink>
    </div>
  )
}
