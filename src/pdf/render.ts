// Punto de entrada del PDF en el navegador (se carga bajo demanda: react-pdf pesa).
import { createElement } from 'react'
import { Font, pdf } from '@react-pdf/renderer'
import figtree400 from '@fontsource/figtree/files/figtree-latin-400-normal.woff?url'
import figtree500 from '@fontsource/figtree/files/figtree-latin-500-normal.woff?url'
import figtree600 from '@fontsource/figtree/files/figtree-latin-600-normal.woff?url'
import figtree700 from '@fontsource/figtree/files/figtree-latin-700-normal.woff?url'
import schibsted500 from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-500-normal.woff?url'
import schibsted700 from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff?url'
import { ReportDocument, type ReportOptions } from './ReportDocument'
import type { ProgressData } from '@/lib/types'

let registered = false

function registerFonts() {
  if (registered) return
  Font.register({
    family: 'Figtree',
    fonts: [
      { src: figtree400, fontWeight: 400 },
      { src: figtree500, fontWeight: 500 },
      { src: figtree600, fontWeight: 600 },
      { src: figtree700, fontWeight: 700 },
    ],
  })
  Font.register({ family: 'Schibsted Grotesk', fonts: [
      { src: schibsted500, fontWeight: 500 },
      { src: schibsted700, fontWeight: 700 },
    ],
  })
  Font.registerHyphenationCallback((word) => [word])
  registered = true
}

export async function renderReport(data: ProgressData, options: ReportOptions): Promise<Blob> {
  registerFonts()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pdf(createElement(ReportDocument, { data, options }) as any).toBlob()
}
