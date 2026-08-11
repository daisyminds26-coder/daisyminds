import { Badge } from '@/shared/components/ui/badge'
import type { BatchDeliveryMode } from '@/features/batches/types'

const DELIVERY_MODE_LABEL: Record<BatchDeliveryMode, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  HYBRID: 'Hybrid',
}

/** Small, informational badge — delivery mode is metadata, not a status, so it uses the plain `Badge` rather than `StatusBadge`'s tone system. */
export function DeliveryModeBadge({ deliveryMode }: { deliveryMode: BatchDeliveryMode }) {
  return <Badge variant="outline">{DELIVERY_MODE_LABEL[deliveryMode]}</Badge>
}
