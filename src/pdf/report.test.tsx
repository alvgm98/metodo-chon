// Renderiza el informe en Node para comprobar que se genera sin errores.
// Con REPORT_OUT=/ruta/informe.pdf guarda el resultado para revisarlo a ojo.
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Font, renderToBuffer } from '@react-pdf/renderer'
import { describe, expect, it } from 'vitest'
import type { Measurement, ProgressData } from '@/lib/types'
import { ReportDocument } from './ReportDocument'

const require = createRequire(import.meta.url)
const font = (pkg: string, file: string) => require.resolve(`@fontsource/${pkg}/files/${file}`)

Font.register({
  family: 'Figtree',
  fonts: [400, 500, 600, 700].map((w) => ({ src: font('figtree', `figtree-latin-${w}-normal.woff`), fontWeight: w })),
})
Font.register({
  family: 'Schibsted Grotesk',
  fonts: [500, 700].map((w) => ({ src: font('schibsted-grotesk', `schibsted-grotesk-latin-${w}-normal.woff`), fontWeight: w })),
})
Font.registerHyphenationCallback((w) => [w])

const rows: [string, number, number, number, number, number][] = [
  ['2026-03-02', 78.4, 36.5, 84.0, 96.0, 108.0],
  ['2026-03-23', 77.1, 36.3, 83.0, 94.5, 107.2],
  ['2026-04-13', 76.0, 36.0, 82.1, 93.0, 106.5],
  ['2026-05-04', 75.2, 35.8, 81.0, 91.8, 105.6],
  ['2026-05-25', 74.6, 35.5, 80.2, 90.5, 104.9],
  ['2026-06-15', 73.5, 35.2, 79.0, 89.2, 104.0],
  ['2026-07-06', 73.9, 35.2, 79.3, 89.6, 103.8],
  ['2026-07-27', 72.4, 34.7, 77.6, 87.8, 102.6],
  ['2026-09-07', 71.0, 34.2, 76.0, 86.0, 101.5],
  ['2026-10-05', 69.8, 33.8, 74.5, 84.0, 100.5],
]

export const DEMO: ProgressData = {
  client: {
    full_name: 'Marta Ruiz Gómez',
    dni: '12345678Z',
    sex: 'female',
    height_cm: 165,
    birth_date: '1988-04-12',
    share_token: '7f3k9qmx2abc',
  },
  professional: { full_name: 'Laura Martín', professional_title: 'Dietista-nutricionista', license_number: 'AND00123' },
  measurements: rows.map(
    ([measured_on, weight_kg, neck_cm, waist_cm, navel_cm, hip_cm]): Measurement => ({
      id: measured_on,
      measured_on,
      weight_kg,
      neck_cm,
      waist_cm,
      navel_cm,
      hip_cm,
    }),
  ),
}

describe('informe PDF', () => {
  it('se genera con 2 páginas', async () => {
    const buf = await renderToBuffer(
      <ReportDocument data={DEMO} options={{ appName: 'Método Chon', portalUrl: 'https://metodochon.app/p/7f3k9qmx2abc', issuedOn: '2026-10-11' }} />,
    )
    if (process.env.REPORT_OUT) writeFileSync(process.env.REPORT_OUT, buf)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
    expect(buf.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(2)
  })

  it('aguanta un cliente con una sola medición y sin altura', async () => {
    const buf = await renderToBuffer(
      <ReportDocument
        data={{ ...DEMO, client: { ...DEMO.client, height_cm: null, sex: 'male' }, measurements: DEMO.measurements.slice(0, 1) }}
        options={{ appName: 'Método Chon', portalUrl: null, issuedOn: '2026-10-11' }}
      />,
    )
    expect(buf.length).toBeGreaterThan(1000)
  })
})
