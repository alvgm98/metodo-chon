import { createClient } from '@supabase/supabase-js'

const raw: string | undefined = import.meta.env.VITE_SUPABASE_URL
// Admite una ruta relativa (p. ej. "/supabase", servida por el proxy de Vite en desarrollo).
const url = raw?.startsWith('/') ? window.location.origin + raw : raw
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})
