import type { ReviewStatus } from '@/lib/metrics'
import { Badge } from './ui'

export function StatusBadge({ status }: { status: ReviewStatus }) {
  if (status === 'ok') return <Badge tone="ok">Al día</Badge>
  if (status === 'pending') return <Badge tone="warn">Revisión pendiente</Badge>
  return <Badge tone="neutral">Sin mediciones</Badge>
}
