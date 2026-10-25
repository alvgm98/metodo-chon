// Función de Vercel: manifest de la PWA para el portal de un cliente concreto.
// Así, si el cliente instala la app desde su enlace (/p/<código>), el icono
// abre directamente SU portal en lugar del acceso de la profesional.
// Solo usa el código del enlace (que ya va en la URL); no toca la base de datos.

const TOKEN = /^[a-z0-9_-]{6,64}$/

export default function handler(req, res) {
  const raw = Array.isArray(req.query.t) ? req.query.t[0] : req.query.t
  const token = typeof raw === 'string' && TOKEN.test(raw) ? raw : null
  const start = token ? `/p/${token}` : '/'

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.status(200).send(
    JSON.stringify({
      id: start,
      name: 'Mi progreso · Método Chon',
      short_name: 'Mi progreso',
      description: 'Tu evolución de peso y medidas.',
      lang: 'es',
      start_url: start,
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#f3f8f4',
      theme_color: '#1f7449',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
  )
}
