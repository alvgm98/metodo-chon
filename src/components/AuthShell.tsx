import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { C_ARC, LEAF, VEIN } from '@/lib/brand'
import { Logo } from './ui'

/** Decoración de la pantalla de acceso: el símbolo de la marca en grande. */
export function LeafDecoration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 400" className={className} aria-hidden>
      <circle cx="300" cy="80" r="320" fill="var(--color-brand-50)" />
      <circle cx="196" cy="252" r="72" fill="var(--color-brand-200)" opacity=".55" />
      <g transform="translate(-10 22) scale(6.2)">
        <path d={C_ARC} fill="none" stroke="var(--color-brand)" strokeWidth="1.35" strokeLinecap="round" />
        <path d={LEAF} fill="var(--color-brand-200)" />
        <path d={VEIN} stroke="var(--color-brand)" strokeWidth=".6" strokeLinecap="round" />
      </g>
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
