import { describe, expect, it } from 'vitest'
import { isValidDni, maskDni, normalizeDni } from './dni'
import { ageFrom, fmtDate, fmtDelta, fmtNum, initials } from './format'
import { bmiSeries, filterRange, reviewStatus, series, summarize, whrSeries } from './metrics'
import { lineGeometry, niceDomain } from './chart'
import type { Measurement } from './types'

const m = (measured_on: string, weight_kg: number | null, waist_cm: number | null = null, hip_cm: number | null = null): Measurement => ({
  id: measured_on,
  measured_on,
  weight_kg,
  neck_cm: null,
  waist_cm,
  navel_cm: null,
  hip_cm,
})

describe('dni', () => {
  it('valida DNI y NIE con letra de control', () => {
    expect(isValidDni('12345678Z')).toBe(true)
    expect(isValidDni('12345678-z')).toBe(true)
    expect(isValidDni('12345678A')).toBe(false)
    expect(isValidDni('X1234567L')).toBe(true)
    expect(isValidDni('1234')).toBe(false)
  })
  it('normaliza y enmascara', () => {
    expect(normalizeDni(' 12.345.678-z ')).toBe('12345678Z')
    expect(maskDni('12345678Z')).toBe('•••••678Z')
  })
})

describe('format', () => {
  it('formatea en español', () => {
    expect(fmtNum(69.8)).toBe('69,8')
    expect(fmtNum(100.5)).toBe('100,5')
    expect(fmtDelta(-8.6)).toBe('−8,6')
    expect(fmtDelta(2.1)).toBe('+2,1')
    expect(fmtDelta(-0.04, 2)).toBe('−0,04')
    expect(fmtDate('2026-10-05')).toBe('5 oct 2026')
    expect(initials('Marta Ruiz Gómez')).toBe('MR')
  })
  it('calcula la edad', () => {
    expect(ageFrom('1988-06-15', '2026-06-14')).toBe(37)
    expect(ageFrom('1988-06-15', '2026-06-15')).toBe(38)
  })
})

describe('metrics', () => {
  const ms = [m('2026-10-05', 69.8, 74.5, 100.5), m('2026-03-02', 78.4, 84, 108), m('2026-07-01', null, 79, 104)]

  it('ordena e ignora huecos', () => {
    expect(series(ms, 'weight_kg').map((p) => p.value)).toEqual([78.4, 69.8])
    expect(series(ms, 'waist_cm')).toHaveLength(3)
  })
  it('resume la variación', () => {
    const s = summarize(series(ms, 'weight_kg'))!
    expect(s.delta).toBe(-8.6)
    expect(s.pct).toBeCloseTo(-10.97, 1)
  })
  it('calcula IMC e ICC', () => {
    expect(bmiSeries(ms, 165).map((p) => p.value)).toEqual([28.8, 25.6])
    expect(whrSeries(ms).map((p) => p.value)).toEqual([0.78, 0.76, 0.74])
  })
  it('filtra por rango desde la última medición', () => {
    expect(filterRange(series(ms, 'waist_cm'), '3m').map((p) => p.date)).toEqual(['2026-10-05'])
    expect(filterRange(series(ms, 'waist_cm'), '6m').map((p) => p.date)).toEqual(['2026-07-01', '2026-10-05'])
  })
  it('marca revisión pendiente tras 30 días', () => {
    expect(reviewStatus('2026-09-11', '2026-10-11')).toBe('ok')
    expect(reviewStatus('2026-09-10', '2026-10-11')).toBe('pending')
    expect(reviewStatus(null)).toBe('empty')
  })
})

describe('chart', () => {
  it('genera dominios redondos', () => {
    expect(niceDomain(69.8, 78.4)).toEqual({ lo: 67.5, hi: 80, step: 2.5 })
  })
  it('sitúa los puntos en el área de dibujo', () => {
    const g = lineGeometry(
      [{ date: '2026-01-01', value: 10 }, { date: '2026-02-01', value: 20 }],
      { width: 300, height: 100, top: 10, right: 10, bottom: 10, left: 10 },
    )
    expect(g.points[0].x).toBe(10)
    expect(g.points[1].x).toBe(290)
    expect(g.points[1].y).toBeLessThan(g.points[0].y)
    expect(g.line.startsWith('M')).toBe(true)
  })
})
