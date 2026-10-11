import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, type LinkProps } from 'react-router'
import { CheckCircle2, Loader2, X } from 'lucide-react'
import { APP_NAME } from '@/config'
import { initials } from '@/lib/format'

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

// --- Marca -------------------------------------------------------------------

export function LogoMark({ className = 'size-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
      <path
        d="M10 23c0-7 4-12 13-13 0 8-4 12-10 12.5M10 23c2.5-3.5 5-5.5 8-7"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className={size === 'sm' ? 'size-8' : 'size-10'} />
      <span className={cx('font-display font-bold tracking-tight text-ink', size === 'sm' ? 'text-lg' : 'text-xl')}>
        {APP_NAME}
      </span>
    </span>
  )
}

// --- Botones -----------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm',
  secondary: 'bg-white text-ink border border-line hover:border-line-strong hover:bg-brand-50/40',
  ghost: 'text-ink-soft hover:bg-brand-50 hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-95',
  dark: 'bg-ink text-white hover:bg-ink/90',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-14 px-6 text-lg gap-2.5 rounded-2xl',
}

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', extra?: string) {
  return cx(
    'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors',
    'disabled:opacity-50 disabled:pointer-events-none',
    variants[variant],
    sizes[size],
    extra,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant, size, loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link {...rest} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  )
}

// --- Formularios -------------------------------------------------------------

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  children: (id: string, describedBy?: string) => ReactNode
  className?: string
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-[15px] font-semibold text-ink">
        {label}
      </label>
      {children(id, hint || error ? hintId : undefined)}
      {(error || hint) && (
        <p id={hintId} className={cx('mt-1.5 text-sm', error ? 'text-danger' : 'text-ink-soft')}>
          {error || hint}
        </p>
      )}
    </div>
  )
}

const inputBase =
  'w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-ink-faint/70 ' +
  'transition-colors hover:border-line-strong focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15 ' +
  'aria-[invalid=true]:border-danger'

export function Input({ className, suffix, ...props }: InputHTMLAttributes<HTMLInputElement> & { suffix?: string }) {
  if (suffix) {
    return (
      <div className="relative">
        <input {...props} className={cx(inputBase, 'h-12 pr-12', className)} />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[15px] text-ink-soft">
          {suffix}
        </span>
      </div>
    )
  }
  return <input {...props} className={cx(inputBase, 'h-12', className)} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputBase, 'min-h-32 py-3', className)} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(inputBase, 'h-12 appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233e5a4b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
      {children}
    </select>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'sm',
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { key: T; label: string }[]
  className?: string
  size?: 'sm' | 'lg'
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex rounded-xl bg-canvas p-1', className)}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cx(
            'flex-1 rounded-lg font-medium transition-all',
            size === 'sm' ? 'px-3.5 py-1.5 text-sm' : 'px-4 py-2.5 text-[15px]',
            value === o.key ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// --- Contenedores ------------------------------------------------------------

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-3xl border border-line bg-white', className)}>{children}</section>
}

export function Avatar({ name, size = 'md', tone = 'soft' }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; tone?: 'soft' | 'solid' }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        tone === 'solid' ? 'bg-brand text-white' : 'bg-brand-100 text-brand-dark',
        size === 'sm' && 'size-9 text-sm',
        size === 'md' && 'size-11 text-[15px]',
        size === 'lg' && 'size-14 text-lg',
        size === 'xl' && 'size-16 text-xl sm:size-20 sm:text-2xl',
      )}
    >
      {initials(name)}
    </span>
  )
}

export function Badge({ tone = 'ok', children }: { tone?: 'ok' | 'warn' | 'neutral' | 'danger'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap',
        tone === 'ok' && 'bg-brand-50 text-brand-dark',
        tone === 'warn' && 'bg-warn-bg text-warn',
        tone === 'neutral' && 'bg-canvas text-ink-soft',
        tone === 'danger' && 'bg-danger-bg text-danger',
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('animate-spin text-brand', className ?? 'size-6')} aria-label="Cargando" />
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  const msg = error instanceof Error ? error.message : String(error)
  return <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{msg}</div>
}

// --- Modal -------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')
    first?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8',
          size === 'md' ? 'sm:max-w-lg' : 'sm:max-w-2xl',
        )}
      >
        <button
          type="button"
          data-close
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-2 text-ink-soft hover:bg-canvas"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>
        <h2 id={titleId} className="pr-10 text-2xl font-bold">{title}</h2>
        {description && <p className="mt-1.5 text-ink-soft">{description}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Eliminar',
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: ReactNode
  confirmLabel?: string
  loading?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    />
  )
}

// --- Toasts ------------------------------------------------------------------

const ToastContext = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])
  const show = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg">
            <CheckCircle2 className="size-4 text-brand-200" />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
