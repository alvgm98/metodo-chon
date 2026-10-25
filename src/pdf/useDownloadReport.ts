import { useState } from 'react'
import { APP_NAME, portalUrl } from '@/config'
import { todayIso } from '@/lib/format'
import { isChunkLoadError, reloadForNewVersion } from '@/lib/chunks'
import type { ProgressData } from '@/lib/types'

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function useDownloadReport() {
  const [busy, setBusy] = useState(false)

  async function download(data: ProgressData): Promise<boolean> {
    setBusy(true)
    try {
      const { renderReport } = await import('./render')
      const blob = await renderReport(data, {
        appName: APP_NAME,
        portalUrl: data.client.share_enabled === false ? null : portalUrl(data.client.share_token),
        issuedOn: todayIso(),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Informe-${slug(data.client.full_name)}-${todayIso()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      return true
    } catch (err) {
      if (isChunkLoadError(err) && reloadForNewVersion()) return false
      console.error(err)
      window.alert('No se ha podido generar el PDF. Inténtalo de nuevo.')
      return false
    } finally {
      setBusy(false)
    }
  }

  return { download, busy }
}
