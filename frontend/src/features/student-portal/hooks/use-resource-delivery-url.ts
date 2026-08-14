import { useMutation } from '@tanstack/react-query'

import { getResourceDeliveryUrl } from '@/features/student-portal/api/student-portal.api'

/** A mutation, not a query — a signed URL is single-use-adjacent (5-minute expiry) and must never be cached/reused stale, so it's fetched fresh on each "Open"/"Download" click. */
export function useResourceDeliveryUrl() {
  return useMutation({
    mutationFn: (resourceId: string) => getResourceDeliveryUrl(resourceId),
  })
}
