import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { FileText, LogOut, Menu, Settings, Users, X } from 'lucide-react'
import { signOut } from '@/auth'
import { useProfile } from '@/lib/api'
import { Avatar, Logo, cx } from '@/components/ui'

const NAV = [
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/informes', label: 'Informes', icon: FileText },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-[16px] font-medium transition-colors',
              isActive ? 'bg-brand-50 text-brand-dark' : 'text-ink-soft hover:bg-canvas hover:text-ink',
            )
          }
        >
          <Icon className="size-5" strokeWidth={1.8} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function UserCard() {
  const { data: profile } = useProfile()
  const name = profile?.full_name || 'Tu perfil'
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{name}</div>
        <div className="truncate text-sm text-ink-soft">{profile?.professional_title}</div>
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded-lg p-2 text-ink-soft hover:bg-white hover:text-ink"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
      >
        <LogOut className="size-5" />
      </button>
    </div>
  )
}

export function ProLayout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <div className="min-h-dvh lg:pl-72">
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-line bg-white px-5 py-7 lg:flex">
        <div className="px-2 pb-9">
          <Logo />
        </div>
        <NavItems />
        <div className="mt-auto">
          <UserCard />
        </div>
      </aside>

      {/* Móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Logo size="sm" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-ink hover:bg-canvas"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[61px] bottom-0 z-20 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="relative space-y-4 border-b border-line bg-white p-4 shadow-lg">
            <NavItems onNavigate={() => setOpen(false)} />
            <UserCard />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <Outlet />
      </main>
    </div>
  )
}
