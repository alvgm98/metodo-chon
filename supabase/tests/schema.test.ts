// Valida la migración en un Postgres embebido (PGlite) que imita lo mínimo de
// Supabase: esquema auth, auth.uid(), roles anon/authenticated y los permisos
// por defecto que Supabase concede sobre el esquema public.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations')

const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    raw_user_meta_data jsonb not null default '{}',
    created_at timestamptz not null default clock_timestamp()
  );
  create role anon nologin;
  create role authenticated nologin;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`

const USER_A = '00000000-0000-0000-0000-00000000000a'
const USER_B = '00000000-0000-0000-0000-00000000000b'

let db: PGlite

async function as(role: 'anon' | 'authenticated' | 'postgres', userId = '') {
  await db.exec(`reset role`)
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId])
  if (role !== 'postgres') await db.exec(`set role ${role}`)
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(SUPABASE_STUB)
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  }
  await db.query(
    `insert into auth.users (id, raw_user_meta_data) values ($1, '{"full_name":"Laura Martín"}'), ($2, '{}')`,
    [USER_A, USER_B],
  )
})

describe('esquema', () => {
  it('crea el perfil al registrar un usuario', async () => {
    await as('authenticated', USER_A)
    const { rows } = await db.query<{ full_name: string }>(`select full_name from public.profiles`)
    expect(rows).toEqual([{ full_name: 'Laura Martín' }])
  })

  it('normaliza el DNI y genera un token de 12 caracteres', async () => {
    await as('authenticated', USER_A)
    const { rows } = await db.query<{ dni: string; share_token: string }>(
      `insert into public.clients (full_name, dni, sex, height_cm)
       values ('  Marta Ruiz Gómez ', '12345678-z', 'female', 165)
       returning dni, share_token`,
    )
    expect(rows[0].dni).toBe('12345678Z')
    expect(rows[0].share_token).toMatch(/^[a-z2-9]{12}$/)
  })

  it('rechaza DNIs con formato inválido', async () => {
    await as('authenticated', USER_A)
    await expect(
      db.query(`insert into public.clients (full_name, dni, sex) values ('X', '1234', 'male')`),
    ).rejects.toThrow()
  })

  it('aísla los datos entre profesionales (RLS)', async () => {
    await as('authenticated', USER_A)
    const { rows: [client] } = await db.query<{ id: string }>(`select id from public.clients`)
    await db.query(
      `insert into public.measurements (client_id, measured_on, weight_kg, waist_cm, hip_cm)
       values ($1, '2026-03-02', 78.4, 84, 108), ($1, '2026-10-05', 69.8, 74.5, 100.5)`,
      [client.id],
    )

    await as('authenticated', USER_B)
    expect((await db.query(`select * from public.clients`)).rows).toHaveLength(0)
    expect((await db.query(`select * from public.measurements`)).rows).toHaveLength(0)
    expect((await db.query(`select * from public.client_overview`)).rows).toHaveLength(0)
    await expect(
      db.query(`insert into public.measurements (client_id, measured_on, weight_kg) values ($1, '2026-01-01', 70)`, [client.id]),
    ).rejects.toThrow(/row-level security/)
  })

  it('resume las mediciones en client_overview', async () => {
    await as('authenticated', USER_A)
    const { rows } = await db.query<Record<string, unknown>>(
      `select measurement_count, first_weight_kg::float8 as first, last_weight_kg::float8 as last,
              last_measured_on::text as last_on
       from public.client_overview`,
    )
    expect(rows).toEqual([{ measurement_count: 2, first: 78.4, last: 69.8, last_on: '2026-10-05' }])
  })

  it('no deja a anon leer tablas', async () => {
    await as('anon')
    await expect(db.query(`select * from public.clients`)).rejects.toThrow(/permission denied/)
    await expect(db.query(`select * from public.measurements`)).rejects.toThrow(/permission denied/)
    await expect(db.query(`select * from public.portal_attempts`)).rejects.toThrow(/permission denied/)
  })
})

describe('portal', () => {
  let token: string

  beforeAll(async () => {
    await as('postgres')
    token = (await db.query<{ share_token: string }>(`select share_token from public.clients`)).rows[0].share_token
  })

  it('muestra el nombre de la profesional con un token válido', async () => {
    await as('anon')
    const { rows } = await db.query<{ info: unknown }>(`select public.portal_info($1) as info`, [token])
    expect(rows[0].info).toEqual({ professional_name: 'Laura Martín', professional_title: 'Dietista-nutricionista' })
    const bad = await db.query<{ info: unknown }>(`select public.portal_info('nope') as info`)
    expect(bad.rows[0].info).toBeNull()
  })

  it('devuelve la evolución con token y DNI correctos (sin observaciones)', async () => {
    await as('anon')
    const { rows } = await db.query<{ r: any }>(`select public.portal_progress($1, ' 12345678z ') as r`, [token])
    expect(rows[0].r.client.full_name).toBe('Marta Ruiz Gómez')
    expect(rows[0].r.client.notes).toBeUndefined()
    expect(rows[0].r.measurements).toHaveLength(2)
    expect(rows[0].r.measurements[0].measured_on).toBe('2026-03-02')
  })

  it('rechaza DNIs incorrectos y bloquea tras 10 intentos', async () => {
    await as('anon')
    for (let i = 0; i < 10; i++) {
      const { rows } = await db.query<{ r: any }>(`select public.portal_progress($1, '00000000T') as r`, [token])
      expect(rows[0].r).toEqual({ error: 'invalid_credentials' })
    }
    const { rows } = await db.query<{ r: any }>(`select public.portal_progress($1, '12345678Z') as r`, [token])
    expect(rows[0].r).toEqual({ error: 'too_many_attempts' })
  })

  it('permite clientes sin DNI, que no pueden entrar en el portal', async () => {
    await as('authenticated', USER_A)
    const { rows } = await db.query<{ dni: string | null; share_token: string }>(
      `insert into public.clients (full_name, dni, sex) values ('Sin DNI', '', 'female'), ('Sin DNI 2', null, 'male')
       returning dni, share_token`,
    )
    expect(rows.map((r) => r.dni)).toEqual([null, null])
    await as('anon')
    const info = await db.query<{ info: unknown }>(`select public.portal_info($1) as info`, [rows[0].share_token])
    expect(info.rows[0].info).toBeNull()
    const progress = await db.query<{ r: unknown }>(`select public.portal_progress($1, '') as r`, [rows[0].share_token])
    expect(progress.rows[0].r).toEqual({ error: 'invalid_credentials' })
    await as('postgres')
    await db.query(`delete from public.clients where full_name like 'Sin DNI%'`)
    await db.exec(`delete from public.portal_attempts`)
  })

  it('carga los datos de demostración (idempotente)', async () => {
    await as('postgres')
    const seed = readFileSync(join(MIGRATIONS_DIR, '..', 'seed_demo.sql'), 'utf8')
    await db.exec(seed)
    await db.exec(seed)
    const { rows } = await db.query<{ n: number; m: number }>(
      `select count(distinct c.id)::int as n, count(m.id)::int as m
       from public.clients c join public.measurements m on m.client_id = c.id
       where c.owner_id = $1 and c.notes = '[demo]'`,
      [USER_A],
    )
    // Marta ya existía (no se duplica): 7 clientes demo con 6+14+4+8+3+11+2 mediciones
    expect(rows[0]).toEqual({ n: 7, m: 48 })
  })

  it('no responde si el enlace está desactivado', async () => {
    await as('postgres')
    await db.exec(`delete from public.portal_attempts; update public.clients set share_enabled = false`)
    await as('anon')
    const { rows } = await db.query<{ r: any }>(`select public.portal_progress($1, '12345678Z') as r`, [token])
    expect(rows[0].r).toEqual({ error: 'invalid_credentials' })
  })
})
