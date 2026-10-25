import { createClient } from '@supabase/supabase-js'

const raw: string | undefined = import.meta.env.VITE_SUPABASE_URL
// Admite una ruta relativa (p. ej. "/supabase", servida por el proxy de Vite en desarrollo).
const url = raw?.startsWith('/') ? window.location.origin + raw : raw
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key)

// --- Servicio no disponible ----------------------------------------------------
// Supabase devuelve 540 cuando el proyecto está pausado (plan gratuito tras 7 días
// sin actividad). Eso, la falta de conexión y los fallos de pasarela se tratan
// igual: se avisa a la interfaz (toast) y se devuelve un error con un mensaje
// comprensible en lugar de uno técnico.

export const SERVICE_UNAVAILABLE_EVENT = 'app:service-unavailable'

const UNAVAILABLE_STATUS = new Set([502, 503, 504, 540, 544])

export function serviceUnavailableMessage(): string {
  return window.location.pathname.startsWith('/p/')
    ? 'Algo ha ocurrido. Contacta con tu profesional.'
    : 'Algo ha ocurrido al conectar con el servidor. Inténtalo de nuevo en unos minutos.'
}

function unavailable(): Response {
  const message = serviceUnavailableMessage()
  window.dispatchEvent(new CustomEvent(SERVICE_UNAVAILABLE_EVENT, { detail: message }))
  // Cuerpo compatible con PostgREST (message/code) y con Auth (msg/error_description).
  const body = { message, msg: message, error_description: message, error: 'service_unavailable', code: 'service_unavailable' }
  return new Response(JSON.stringify(body), { status: 503, headers: { 'Content-Type': 'application/json' } })
}

const resilientFetch: typeof fetch = async (input, init) => {
  let response: Response
  try {
    response = await fetch(input, init)
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    return unavailable()
  }
  return UNAVAILABLE_STATUS.has(response.status) ? unavailable() : response
}

export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
  global: { fetch: resilientFetch },
})
