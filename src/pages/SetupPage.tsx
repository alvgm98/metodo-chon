import { Logo } from '@/components/ui'

/** Se muestra si faltan las variables de entorno de Supabase. */
export function SetupPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Logo />
      <h1 className="mt-10 text-4xl font-extrabold">Falta conectar Supabase</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Crea un archivo <code className="rounded bg-white px-1.5 py-0.5">.env.local</code> en la raíz del proyecto (o
        configura las variables en tu hosting) con:
      </p>
      <pre className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white p-5 text-sm">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica`}
      </pre>
      <p className="mt-6 text-ink-soft">Consulta el README para los pasos completos.</p>
    </div>
  )
}
