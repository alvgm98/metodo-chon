import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Logo } from './ui'

/** Hoja decorativa de la pantalla de acceso (como en el diseño del portal). */
export function LeafDecoration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 400" className={className} aria-hidden>
      <circle cx="300" cy="80" r="320" fill="var(--color-brand-50)" />
      <circle cx="248" cy="272" r="92" fill="var(--color-brand-200)" />
      <path
        d="M72 290c-2-40 18-70 50-80 38-12 62-28 74-58M242 97c18 40 22 80 10 112-18 48-84 74-126 58-30-12-46-46-34-76 12-32 46-40 76-46 34-8 60-22 74-48Z"
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AuthShell({ title, intro, children, footer }: { title: ReactNode; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-white">
      <LeafDecoration className="pointer-events-none absolute -top-4 -right-24 w-[300px] sm:-right-10 sm:w-[420px]" />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-14 pb-8 sm:justify-center sm:pt-8">
        <Logo />
        <h1 className="mt-24 text-[44px] leading-[1.02] font-extrabold tracking-[-0.035em] text-ink sm:mt-20 sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 text-lg leading-relaxed text-ink-soft">{intro}</p>}
        <div className="mt-9">{children}</div>
        <div className="mt-auto pt-14 sm:mt-14">
          {footer ?? (
            <p className="flex gap-3 text-[15px] text-ink-soft">
              <Lock className="mt-0.5 size-5 shrink-0" />
              Tus datos de salud solo los ves tú y tu nutricionista. El acceso se cierra al salir.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
