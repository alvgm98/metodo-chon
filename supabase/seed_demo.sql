-- =============================================================================
-- Datos de DEMOSTRACIÓN (opcional). Crea 8 clientes ficticios con mediciones
-- para la primera cuenta profesional. Ejecútalo en Supabase → SQL Editor
-- DESPUÉS de crear tu usuario. Para borrarlos:
--   delete from public.clients where notes = '[demo]';
-- =============================================================================
do $$
declare
  v_owner  uuid;
  v_client uuid;
  r        record;
  i        int;
  t        numeric;   -- progreso 0..1
  wobble   numeric;
begin
  select id into v_owner from auth.users order by created_at limit 1;
  if v_owner is null then
    raise exception 'No hay usuarios. Crea primero tu cuenta en Authentication → Users.';
  end if;

  update public.profiles
     set full_name = coalesce(nullif(full_name, ''), 'Laura Martín')
   where id = v_owner;

  for r in
    select * from (values
      -- nombre, dni, sexo, altura, nacimiento, objetivo, días desde la última medición, nº mediciones,
      -- peso inicial, Δpeso, cuello, cintura, ombligo, cadera (iniciales), Δperímetros (factor)
      ('Marta Ruiz Gómez',     '12345678Z', 'female', 165, date '1988-04-12', 'Pérdida de grasa',   6, 10, 78.4, -8.6, 36.5,  84.0,  96.0, 108.0, 1.00),
      ('Javier Ortega Sanz',   '48291907A', 'male',   178, date '1985-09-02', 'Pérdida de grasa',   3,  6, 92.1, -3.2, 41.0,  98.0, 104.0, 106.0, 0.45),
      ('Lucía Fernández Mora', '53718345M', 'female', 170, date '1996-01-23', 'Ganancia muscular', 10, 14, 58.3,  2.1, 31.5,  66.0,  74.0,  92.0, -0.15),
      ('Andrés Molina Vidal',  '71204814B', 'male',   182, date '1979-06-30', 'Pérdida de grasa',  17,  4, 88.5, -1.8, 40.0,  94.0,  99.0, 103.0, 0.25),
      ('Carmen Navarro Gil',   '26490180E', 'female', 160, date '1972-11-15', 'Pérdida de grasa',  22,  8, 74.9, -5.4, 35.5,  86.0,  95.0, 106.0, 0.65),
      ('Pablo Delgado Ruiz',   '39857432L', 'male',   175, date '1990-03-08', 'Mantenimiento',     29,  3, 76.2, -0.9, 38.0,  84.0,  88.0,  98.0, 0.10),
      ('Elena Castro Prieto',  '60412956Y', 'female', 168, date '1983-08-19', 'Pérdida de grasa',  43, 11, 81.0, -6.7, 36.0,  88.0,  99.0, 112.0, 0.80),
      ('Sergio Romero Blanco', '15873019Y', 'male',   171, date '1994-12-01', 'Salud digestiva',   62,  2, 70.4, -0.4, 37.0,  80.0,  85.0,  95.0, 0.05)
    ) as v(full_name, dni, sex, height, birth, goal, last_ago, n, w0, dw, neck0, waist0, navel0, hip0, k)
  loop
    insert into public.clients (owner_id, full_name, dni, sex, height_cm, birth_date, goal, notes, created_at)
    values (v_owner, r.full_name, r.dni, r.sex, r.height, r.birth, r.goal, '[demo]',
            now() - make_interval(days => r.last_ago + (r.n - 1) * 21))
    on conflict (owner_id, dni) do nothing
    returning id into v_client;

    continue when v_client is null;

    for i in 0 .. r.n - 1 loop
      t := i::numeric / greatest(r.n - 1, 1);
      wobble := case when i in (0, r.n - 1) then 0 else sin(i * 1.7) * 0.4 end;
      insert into public.measurements (client_id, measured_on, weight_kg, neck_cm, waist_cm, navel_cm, hip_cm)
      values (
        v_client,
        current_date - r.last_ago - (r.n - 1 - i) * 21,
        round(r.w0 + r.dw * t + wobble, 1),
        round(r.neck0  - 2.7  * r.k * t + wobble * 0.2, 1),
        round(r.waist0 - 9.5  * r.k * t + wobble * 0.5, 1),
        round(r.navel0 - 12.0 * r.k * t + wobble * 0.6, 1),
        round(r.hip0   - 7.5  * r.k * t + wobble * 0.4, 1)
      );
    end loop;
  end loop;
end
$$;
