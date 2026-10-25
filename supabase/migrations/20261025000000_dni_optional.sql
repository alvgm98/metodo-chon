-- =============================================================================
-- El DNI/NIE del cliente pasa a ser opcional.
-- Un cliente sin DNI no puede entrar en el portal: su enlace se muestra como
-- "no disponible" y portal_progress nunca le encuentra.
-- =============================================================================

alter table public.clients alter column dni drop not null;

-- Un DNI vacío se guarda como NULL (si no, el check de formato fallaría con '').
-- La restricción unique (owner_id, dni) admite varios NULL.
create or replace function public.clients_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.dni := nullif(public.normalize_dni(new.dni), '');
  new.full_name := btrim(new.full_name);
  return new;
end;
$$;

-- Sin DNI no hay acceso: el enlace no muestra ni la pantalla de entrada.
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
  where c.share_token = p_token and c.share_enabled and c.dni is not null;
$$;
