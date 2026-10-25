import { useState } from 'react'
import { Check, Copy, IdCard, MessageCircle, RefreshCw } from 'lucide-react'
import { newShareToken, useUpdateShare } from '@/lib/api'
import { firstName } from '@/lib/format'
import type { Client } from '@/lib/types'
import { portalUrl } from '@/config'
import { Button, ButtonLink, ConfirmModal, ErrorBox, Modal, cx, useToast } from './ui'

export function ShareModal({ open, onClose, client }: { open: boolean; onClose: () => void; client: Client }) {
  const update = useUpdateShare()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const url = portalUrl(client.share_token)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast('Enlace copiado')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* el usuario puede copiarlo a mano */
    }
  }

  const message = `Hola ${firstName(client.full_name)}, aquí puedes ver la evolución de tus mediciones: ${url} (accede con tu DNI).`

  // Sin DNI no hay forma de entrar al portal: en vez del enlace, se explica cómo habilitarlo.
  if (!client.dni) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Compartir progreso"
        footer={
          <>
            <Button onClick={onClose}>Cerrar</Button>
            <ButtonLink to={`/clientes/${client.id}/editar`} variant="primary">
              Añadir DNI
            </ButtonLink>
          </>
        }
      >
        <div className="flex gap-3 rounded-2xl bg-warn-bg p-4 text-warn">
          <IdCard className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>{firstName(client.full_name)} no tiene DNI en su ficha.</strong> El DNI es la clave para entrar en su
            portal, así que sin él no puede ver su progreso. Añádelo en la ficha para poder compartirle el enlace.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Compartir progreso"
        description={<>El cliente abre este enlace y entra con su DNI. No verá tus observaciones.</>}
      >
        <div className="space-y-6">
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4">
            <span>
              <span className="block font-semibold">Enlace activo</span>
              <span className="text-sm text-ink-soft">Desactívalo para cortar el acceso al portal.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={client.share_enabled}
              onClick={() => update.mutate({ id: client.id, share_enabled: !client.share_enabled })}
              className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', client.share_enabled ? 'bg-brand' : 'bg-line-strong')}
            >
              <span className={cx('absolute top-1 size-5 rounded-full bg-white shadow transition-all', client.share_enabled ? 'left-6' : 'left-1')} />
            </button>
          </label>

          <div className={cx('space-y-3 transition-opacity', !client.share_enabled && 'pointer-events-none opacity-40')}>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-4 font-mono text-sm text-ink"
                aria-label="Enlace del portal"
              />
              <Button variant="primary" onClick={copy} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold hover:border-line-strong"
              >
                <MessageCircle className="size-4" /> Enviar por WhatsApp
              </a>
              <Button size="sm" variant="ghost" icon={<RefreshCw className="size-4" />} onClick={() => setConfirmRegen(true)}>
                Generar enlace nuevo
              </Button>
            </div>
          </div>
          <ErrorBox error={update.error} />
        </div>
      </Modal>

      <ConfirmModal
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        onConfirm={async () => {
          await update.mutateAsync({ id: client.id, share_token: newShareToken() })
          setConfirmRegen(false)
          toast('Enlace nuevo generado')
        }}
        loading={update.isPending}
        title="¿Generar un enlace nuevo?"
        description="El enlace actual dejará de funcionar. Tendrás que enviar el nuevo al cliente."
        confirmLabel="Generar enlace nuevo"
      />
    </>
  )
}
