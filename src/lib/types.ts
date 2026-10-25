export type Sex = 'female' | 'male'

export interface Profile {
  id: string
  full_name: string
  professional_title: string
  license_number: string | null
}

export interface Client {
  id: string
  owner_id: string
  full_name: string
  dni: string | null
  birth_date: string | null
  sex: Sex
  height_cm: number | null
  goal: string | null
  notes: string | null
  share_token: string
  share_enabled: boolean
  created_at: string
  updated_at: string
}

export interface ClientOverview extends Client {
  measurement_count: number
  first_measured_on: string | null
  last_measured_on: string | null
  first_weight_kg: number | null
  last_weight_kg: number | null
}

export type MetricKey = 'weight_kg' | 'neck_cm' | 'waist_cm' | 'navel_cm' | 'hip_cm'

export type MeasurementValues = Record<MetricKey, number | null>

export interface Measurement extends MeasurementValues {
  id: string
  client_id?: string
  measured_on: string // YYYY-MM-DD
}

export type ClientInput = Pick<
  Client,
  'full_name' | 'dni' | 'birth_date' | 'sex' | 'height_cm' | 'goal' | 'notes'
>

export type MeasurementInput = MeasurementValues & { measured_on: string }

/** Lo que necesitan el informe PDF y el portal; común a profesional y cliente. */
export interface ProgressData {
  client: Pick<Client, 'full_name' | 'dni' | 'sex' | 'height_cm' | 'birth_date' | 'share_token'> & {
    share_enabled?: boolean
  }
  professional: Pick<Profile, 'full_name' | 'professional_title' | 'license_number'> | null
  measurements: Measurement[]
}
