# Método Chon

Aplicación web para una dietista-nutricionista: fichas de clientes, registro de mediciones
(peso, cuello, cintura estrecha, zona del ombligo y cadera), gráficas de evolución, informe PDF
descargable y un **portal público** donde cada cliente entra con su DNI para ver su progreso.

- **Profesional** → `/login` (email y contraseña).
- **Cliente** → `/p/<código>` (enlace que le comparte la profesional; entra con su DNI). También puede
  pegar el enlace o el código en la pestaña «Cliente» de `/login`.

## Stack (todo con plan gratuito)

| Pieza | Tecnología | Hosting gratuito |
| --- | --- | --- |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 | Vercel, Netlify o Cloudflare Pages |
| Backend | Supabase (Postgres + Auth + API REST) | Supabase Free |
| Gráficas | SVG propio (sin librería), interactivo con ratón, toque y teclado | — |
| PDF | `@react-pdf/renderer`, generado en el navegador (se carga solo al descargar) | — |

No hay servidor propio: el frontend es estático y habla directamente con Supabase. La seguridad
está en la base de datos (Row Level Security), no en el frontend.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (región UE, p. ej. Frankfurt, por ser datos de salud).
2. **SQL Editor** → pega y ejecuta [`supabase/migrations/20261011000000_init.sql`](supabase/migrations/20261011000000_init.sql).
3. **Authentication → Users → Add user**: crea la cuenta de la nutricionista (email + contraseña,
   marca *Auto Confirm User*).
4. **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*
   (nadie más debe poder registrarse).
5. **Authentication → URL Configuration**: pon en *Site URL* la URL donde publiques la web y añade
   `https://TU-DOMINIO/restablecer` en *Redirect URLs* (para recuperar la contraseña).
6. (Opcional) Ejecuta [`supabase/seed_demo.sql`](supabase/seed_demo.sql) para cargar 8 clientes de ejemplo.
   Se borran con `delete from public.clients where notes = '[demo]';`.
7. **Project Settings → API**: copia la *Project URL* y la clave pública (*anon* o *publishable*).

### 2. Desarrollo local

Requiere Node.js 20 o superior.

```bash
cp .env.example .env.local   # y rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev                  # http://localhost:5173
```

Después, en la app: **Ajustes** → completa nombre, profesión y nº de colegiada (salen en el PDF y en el portal).

**Alternativa sin cuenta en Supabase** (requiere Docker Desktop): `npx supabase start -x studio,realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta`
levanta Postgres + Auth + API en local y aplica las migraciones. Usa en `.env.local` la URL `http://127.0.0.1:54321`
y la clave *anon/publishable* que muestra `npx supabase status`. Para crear la usuaria local:

```bash
curl -X POST http://127.0.0.1:54321/auth/v1/admin/users -H "apikey: <SECRET_KEY>" -H "Authorization: Bearer <SECRET_KEY>" -H "Content-Type: application/json" -d '{"email":"demo@local.test","password":"<contraseña>","email_confirm":true}'
```

### 3. Publicar (Vercel, Netlify o Cloudflare Pages)

- Importa el repositorio. Comando de build `npm run build`, carpeta de salida `dist`.
- Añade las variables de entorno `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y, si quieres, `VITE_APP_NAME`.
- Las rutas de la SPA ya están resueltas: `vercel.json` (Vercel) y `public/_redirects` (Netlify/Cloudflare).
- Actualiza la *Site URL* de Supabase con el dominio final.

### 4. Evitar que Supabase se pause

Los proyectos gratuitos se pausan tras 7 días sin actividad. El workflow
[`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml) hace una consulta diaria si subes el
repo a GitHub y defines los *secrets* `SUPABASE_URL` y `SUPABASE_ANON_KEY` (Settings → Secrets → Actions).

## Modelo de datos

- **profiles**: perfil de la profesional (nombre, profesión, nº de colegiada). Se crea solo al dar de alta el usuario.
- **clients**: nombre, DNI/NIE (normalizado y único por profesional), fecha de nacimiento, sexo, altura,
  objetivo, observaciones privadas, `share_token` (código del enlace público) y `share_enabled`.
- **measurements**: fecha + peso (kg), cuello, cintura estrecha, zona ombligo y cadera (cm). Todos opcionales,
  pero al menos uno obligatorio.
- **client_overview** (vista): cliente + nº de mediciones, primera/última fecha y peso inicial/actual.

Indicadores calculados: **IMC** (peso / altura²) e **ICC** (cintura estrecha / cadera), con las referencias de la OMS
(IMC 18,5–24,9; ICC de riesgo ≥ 0,85 en mujeres y ≥ 0,90 en hombres). Un cliente pasa a «Revisión pendiente» tras
30 días sin medir (`REVIEW_AFTER_DAYS` en `src/config.ts`).

## Seguridad y privacidad

- RLS: cada profesional solo puede leer y modificar sus propios clientes y mediciones.
- El rol anónimo **no** tiene acceso a ninguna tabla. El portal usa dos funciones `security definer`:
  - `portal_info(token)` → solo el nombre de la profesional.
  - `portal_progress(token, dni)` → datos del cliente si el código **y** el DNI coinciden. Nunca devuelve las
    observaciones. Bloquea el enlace 15 minutos tras 10 intentos fallidos.
- El código del enlace tiene 12 caracteres aleatorios (~60 bits): el DNI por sí solo no da acceso.
- La profesional puede desactivar el enlace o generar uno nuevo (el anterior deja de funcionar) desde «Compartir enlace».
- En el portal, la sesión se guarda solo en la pestaña (`sessionStorage`) y se borra al pulsar «Salir».

> Son datos de salud (categoría especial del RGPD). Recuerda informar a los clientes y recoger su
> consentimiento; Supabase ofrece DPA y alojamiento en la UE.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprobación de tipos + build de producción en `dist/` |
| `npm test` | Tests: utilidades, generación del PDF y el esquema SQL completo (RLS, portal, seed) sobre Postgres embebido (PGlite) |

Para revisar el PDF de ejemplo: `REPORT_OUT=informe.pdf npx vitest run src/pdf`.

## Estructura

```
src/
  lib/          api (Supabase + React Query), métricas, formato es-ES, DNI, geometría de gráficas y silueta
  components/   UI base, gráficas SVG, indicadores IMC/ICC, modales de medición y de compartir
  pages/        login, clientes, alta/edición, ficha, informes, ajustes y portal del cliente
  pdf/          documento del informe (react-pdf) y descarga
supabase/
  migrations/   esquema, RLS y funciones del portal
  seed_demo.sql datos de ejemplo
  tests/        tests del esquema con PGlite
```
