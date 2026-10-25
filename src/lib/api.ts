import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { normalizeDni } from './dni'
import type {
  Client,
  ClientInput,
  ClientOverview,
  Measurement,
  MeasurementInput,
  Profile,
  ProgressData,
} from './types'

export const qk = {
  profile: ['profile'] as const,
  clients: ['clients'] as const,
  client: (id: string) => ['client', id] as const,
  measurements: (id: string) => ['measurements', id] as const,
}

export class ApiError extends Error {}

function check<T>(res: { data: T | null; error: PostgrestError | null }): T {
  if (res.error) throw new ApiError(humanize(res.error))
  return res.data as T
}

function humanize(error: PostgrestError): string {
  if (error.code === '23505' && error.message.includes('dni')) return 'Ya tienes un cliente con ese DNI.'
  if (error.code === '23514') return 'Hay algún valor fuera de rango. Revisa los datos.'
  if (error.code === 'PGRST116') return 'No se ha encontrado el registro.'
  if (error.message?.includes('Failed to fetch')) return 'No hay conexión con el servidor.'
  return error.message || 'Ha ocurrido un error inesperado.'
}

// --- Perfil ------------------------------------------------------------------

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async () =>
      check(await supabase.from('profiles').select('id, full_name, professional_title, license_number').single()) as Profile,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: Profile) =>
      check(
        await supabase
          .from('profiles')
          .update({ full_name: p.full_name, professional_title: p.professional_title, license_number: p.license_number })
          .eq('id', p.id)
          .select()
          .single(),
      ) as Profile,
    onSuccess: (data) => qc.setQueryData(qk.profile, data),
  })
}

// --- Clientes ----------------------------------------------------------------

export function useClients() {
  return useQuery({
    queryKey: qk.clients,
    queryFn: async () =>
      check(await supabase.from('client_overview').select('*').order('full_name')) as ClientOverview[],
  })
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: qk.client(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => check(await supabase.from('clients').select('*').eq('id', id!).single()) as Client,
  })
}

export function useSaveClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ClientInput }) => {
      const row = { ...input, dni: (input.dni && normalizeDni(input.dni)) || null }
      const query = id
        ? supabase.from('clients').update(row).eq('id', id)
        : supabase.from('clients').insert(row)
      return check(await query.select().single()) as Client
    },
    onSuccess: (client) => {
      qc.setQueryData(qk.client(client.id), client)
      qc.invalidateQueries({ queryKey: qk.clients })
    },
  })
}

export function useUpdateShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; share_enabled?: boolean; share_token?: string }) =>
      check(await supabase.from('clients').update(patch).eq('id', id).select().single()) as Client,
    onSuccess: (client) => {
      qc.setQueryData(qk.client(client.id), client)
      qc.invalidateQueries({ queryKey: qk.clients })
    },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      check(await supabase.from('clients').delete().eq('id', id))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clients }),
  })
}

// --- Mediciones --------------------------------------------------------------

const MEASUREMENT_COLUMNS = 'id, client_id, measured_on, weight_kg, neck_cm, waist_cm, navel_cm, hip_cm'

export async function fetchMeasurements(clientId: string): Promise<Measurement[]> {
  return check(
    await supabase
      .from('measurements')
      .select(MEASUREMENT_COLUMNS)
      .eq('client_id', clientId)
      .order('measured_on')
      .order('created_at'),
  ) as Measurement[]
}

export function useMeasurements(clientId: string | undefined) {
  return useQuery({
    queryKey: qk.measurements(clientId ?? ''),
    enabled: Boolean(clientId),
    queryFn: () => fetchMeasurements(clientId!),
  })
}

export function useSaveMeasurement(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: MeasurementInput }) => {
      const query = id
        ? supabase.from('measurements').update(input).eq('id', id)
        : supabase.from('measurements').insert({ ...input, client_id: clientId })
      return check(await query.select(MEASUREMENT_COLUMNS).single()) as Measurement
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.measurements(clientId) })
      qc.invalidateQueries({ queryKey: qk.clients })
    },
  })
}

export function useDeleteMeasurement(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      check(await supabase.from('measurements').delete().eq('id', id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.measurements(clientId) })
      qc.invalidateQueries({ queryKey: qk.clients })
    },
  })
}

// --- Informe -----------------------------------------------------------------

export function toProgressData(client: Client, measurements: Measurement[], profile: Profile | null | undefined): ProgressData {
  return {
    client,
    professional: profile ?? null,
    measurements,
  }
}

// --- Portal (anónimo) --------------------------------------------------------

export interface PortalInfo {
  professional_name: string
  professional_title: string
}

export async function getPortalInfo(token: string): Promise<PortalInfo | null> {
  return check(await supabase.rpc('portal_info', { p_token: token })) as PortalInfo | null
}

export type PortalResult = ProgressData | { error: 'invalid_credentials' | 'too_many_attempts' }

export async function getPortalProgress(token: string, dni: string): Promise<PortalResult> {
  return check(await supabase.rpc('portal_progress', { p_token: token, p_dni: normalizeDni(dni) })) as PortalResult
}

// --- Utilidades --------------------------------------------------------------

const TOKEN_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export function newShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join('')
}
