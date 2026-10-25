import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { isIos, isStandalone, onInstallPrompt, promptInstall, type BeforeInstallPromptEvent } from '@/lib/pwa'
import { LogoMark } from './ui'

const DISMISS_KEY = 'pwa:install-dismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Tarjeta "Instala la app". En Android/Chrome usa el diálogo nativo; en iPhone,
 * donde no existe, explica los dos pasos de Safari. No aparece si ya está instalada
 * o si el usuario la ha cerrado.
 */
export function InstallPrompt({ title = 'Ten tu progreso a un toque' }: { title?: string }) {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed())
  const ios = isIos()

  useEffect(() => onInstallPrompt(setEvent), [])

  if (hidden || (!event && !ios)) return null

  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignorar */
    }
  }

  return (
    <div className="relative flex items-start gap-4 rounded-3xl border border-line bg-white p-4 pr-11 sm:p-5 sm:pr-12">
      <LogoMark className="size-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {event ? (
          <>
            <p className="mt-0.5 text-sm text-ink-soft">Instala la app en tu móvil y ábrela como cualquier otra.</p>
            <button
              type="button"
              onClick={() => promptInstall().then((ok) => ok && setHidden(true))}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <Download className="size-4" /> Instalar app
            </button>
          </>
        ) : (
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            En Safari, pulsa <Share className="inline size-4 -translate-y-0.5 text-brand" aria-label="Compartir" />{' '}
            <strong className="text-ink">Compartir</strong> y después{' '}
            <SquarePlus className="inline size-4 -translate-y-0.5 text-brand" aria-hidden />{' '}
            <strong className="text-ink">Añadir a pantalla de inicio</strong>.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 rounded-lg p-1.5 text-ink-faint hover:bg-canvas hover:text-ink"
        aria-label="No mostrar más"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
