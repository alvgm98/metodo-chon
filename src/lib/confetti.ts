// Confeti ligero en canvas, sin dependencias. Respeta "reducir movimiento".

const COLORS = ['#1f7449', '#a9dbbc', '#ffffff', '#f6c453', '#f28b82', '#7cc4a0']

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rot: number
  vr: number
  shape: 'rect' | 'circle'
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Lanza confeti desde el centro superior del elemento (o de la pantalla). */
export function fireConfetti(origin?: HTMLElement | null, count = 140): void {
  if (prefersReducedMotion()) return
  const canvas = document.createElement('canvas')
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '100',
  })
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const rect = origin?.getBoundingClientRect()
  const ox = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const oy = rect ? rect.top + Math.min(rect.height * 0.3, 140) : window.innerHeight / 3

  const pieces: Piece[] = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
    const speed = 7 + Math.random() * 9
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      shape: Math.random() < 0.7 ? 'rect' : 'circle',
    }
  })

  const start = performance.now()
  const DURATION = 3200

  function frame(now: number) {
    const t = now - start
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    const fade = Math.max(0, 1 - Math.max(0, t - DURATION * 0.6) / (DURATION * 0.4))
    for (const p of pieces) {
      p.vy += 0.28 // gravedad
      p.vx *= 0.985 // rozamiento
      p.vy *= 0.985
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx.save()
      ctx.globalAlpha = fade
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      else {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    if (t < DURATION) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}
