import { useQuery } from '@tanstack/react-query'

import { getLiveClass } from '@/features/live-classes/api/live-classes.api'
import { liveClassesKeys } from '@/features/live-classes/api/query-keys'

export function useLiveClass(id: string | undefined) {
  return useQuery({
    queryKey: liveClassesKeys.detail(id ?? ''),
    queryFn: () => getLiveClass(id ?? ''),
    enabled: Boolean(id),
  })
}
