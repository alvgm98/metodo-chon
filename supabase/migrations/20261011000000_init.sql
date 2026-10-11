-- =============================================================================
-- Método Chon · esquema inicial
-- Ejecutar en Supabase → SQL Editor (o `supabase db push`).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Perfil de la profesional (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text not null default '',
  professional_title text not null default 'Dietista-nutricionista',
  license_number     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Token corto y aleatorio para la URL pública del portal (/p/<token>).
-- 12 caracteres de un alfabeto de 32 símbolos sin ambigüedades ≈ 60 bits.
create or replace function public.generate_share_token()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  result text := '';
begin
  for i in 0..11 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

-- DNI/NIE normalizado: mayúsculas, sin espacios ni guiones.
create or replace function public.normalize_dni(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(value, ''), '[^0-9A-Za-z]', '', 'g'));
$$;

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  full_name     text not null check (length(btrim(full_name)) > 0),
  dni           text not null check (dni ~ '^[0-9XYZ][0-9]{7}[A-Z]$'),
  birth_date    date,
  sex           text not null check (sex in ('female', 'male')),
  height_cm     numeric(4, 1) check (height_cm between 50 and 250),
  goal          text,
  notes         text,
  share_token   text not null unique default public.generate_share_token(),
  share_enabled boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, dni)
);

create index clients_owner_idx on public.clients (owner_id);

create or replace function public.clients_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.dni := public.normalize_dni(new.dni);
  new.full_name := btrim(new.full_name);
  return new;
end;
$$;

create trigger clients_normalize
  before insert or update on public.clients
  for each row execute function public.clients_normalize();

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Mediciones
-- -----------------------------------------------------------------------------
create table public.measurements (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  measured_on date not null,
  weight_kg   numeric(4, 1) check (weight_kg between 1 and 500),
  neck_cm     numeric(4, 1) check (neck_cm between 1 and 300),
  waist_cm    numeric(4, 1) check (waist_cm between 1 and 300),
  navel_cm    numeric(4, 1) check (navel_cm between 1 and 300),
  hip_cm      numeric(4, 1) check (hip_cm between 1 and 300),
  created_at  timestamptz not null default now(),
  constraint measurements_not_empty
    check (coalesce(weight_kg, neck_cm, waist_cm, navel_cm, hip_cm) is not null)
);

create index measurements_client_date_idx on public.measurements (client_id, measured_on);

-- -----------------------------------------------------------------------------
-- Vista resumen para el listado de clientes
-- -----------------------------------------------------------------------------
create view public.client_overview
with (security_invoker = true)
as
select
  c.*,
  coalesce(s.measurement_count, 0)::int as measurement_count,
  s.first_measured_on,
  s.last_measured_on,
  (select m.weight_kg from public.measurements m
    where m.client_id = c.id and m.weight_kg is not null
    order by m.measured_on asc, m.created_at asc limit 1) as first_weight_kg,
  (select m.weight_kg from public.measurements m
    where m.client_id = c.id and m.weight_kg is not null
    order by m.measured_on desc, m.created_at desc limit 1) as last_weight_kg
from public.clients c
left join lateral (
  select count(*) as measurement_count,
         min(m.measured_on) as first_measured_on,
         max(m.measured_on) as last_measured_on
  from public.measurements m
  where m.client_id = c.id
) s on true;

-- -----------------------------------------------------------------------------
-- Row Level Security: cada profesional solo ve lo suyo
-- -----------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.clients      enable row level security;
alter table public.measurements enable row level security;

create policy "profiles: leer el propio" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: editar el propio" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "clients: todo sobre los propios" on public.clients
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "measurements: todo sobre las de mis clientes" on public.measurements
  for all to authenticated
  using (exists (select 1 from public.clients c
                 where c.id = client_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.clients c
                      where c.id = client_id and c.owner_id = (select auth.uid())));

revoke all on public.profiles, public.clients, public.measurements, public.client_overview from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.clients, public.measurements to authenticated;
grant select on public.client_overview to authenticated;

-- -----------------------------------------------------------------------------
-- Portal del cliente (acceso público con token + DNI)
-- El rol anon NO tiene acceso a las tablas; solo a estas dos funciones.
-- -----------------------------------------------------------------------------
create table public.portal_attempts (
  id           bigint generated always as identity primary key,
  share_token  text not null,
  attempted_at timestamptz not null default now()
);
create index portal_attempts_token_idx on public.portal_attempts (share_token, attempted_at);
alter table public.portal_attempts enable row level security;
revoke all on public.portal_attempts from anon, authenticated;

-- Datos mínimos para la pantalla de acceso (nombre de la profesional).
create or replace function public.portal_info(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'professional_name', p.full_name,
    'professional_title', p.professional_title
  )
  from public.clients c
  join public.profiles p on p.id = c.owner_id
  where c.share_token = p_token and c.share_enabled;
$$;

-- Devuelve la evolución del cliente si token y DNI coinciden.
-- Máx. 10 intentos fallidos por enlace cada 15 minutos.
create or replace function public.portal_progress(p_token text, p_dni text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_client   public.clients;
  v_failures int;
begin
  delete from public.portal_attempts where attempted_at < now() - interval '1 day';

  select count(*) into v_failures
  from public.portal_attempts
  where share_token = p_token and attempted_at > now() - interval '15 minutes';

  if v_failures >= 10 then
    return jsonb_build_object('error', 'too_many_attempts');
  end if;

  select * into v_client
  from public.clients
  where share_token = p_token
    and share_enabled
    and dni = public.normalize_dni(p_dni);

  if not found then
    insert into public.portal_attempts (share_token) values (left(coalesce(p_token, ''), 64));
    return jsonb_build_object('error', 'invalid_credentials');
  end if;

  delete from public.portal_attempts where share_token = p_token;

  return jsonb_build_object(
    'client', jsonb_build_object(
      'full_name',   v_client.full_name,
      'dni',         v_client.dni,
      'sex',         v_client.sex,
      'height_cm',   v_client.height_cm,
      'birth_date',  v_client.birth_date,
      'share_token', v_client.share_token
    ),
    'professional', (
      select jsonb_build_object(
        'full_name', p.full_name,
        'professional_title', p.professional_title,
        'license_number', p.license_number
      )
      from public.profiles p where p.id = v_client.owner_id
    ),
    'measurements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'measured_on', m.measured_on,
        'weight_kg', m.weight_kg,
        'neck_cm', m.neck_cm,
        'waist_cm', m.waist_cm,
        'navel_cm', m.navel_cm,
        'hip_cm', m.hip_cm
      ) order by m.measured_on, m.created_at)
      from public.measurements m
      where m.client_id = v_client.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.portal_info(text) from public;
revoke all on function public.portal_progress(text, text) from public;
grant execute on function public.portal_info(text) to anon, authenticated;
grant execute on function public.portal_progress(text, text) to anon, authenticated;

-- Funciones internas: no exponer por la API
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.generate_share_token() from public, anon;
grant execute on function public.generate_share_token() to authenticated;
