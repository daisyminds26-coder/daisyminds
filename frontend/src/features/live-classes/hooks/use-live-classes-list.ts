import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listLiveClasses } from '@/features/live-classes/api/live-classes.api'
import { liveClassesKeys } from '@/features/live-classes/api/query-keys'
import type { ListLiveClassesParams } from '@/features/live-classes/types'

export function useLiveClassesList(params: ListLiveClassesParams) {
  return useQuery({
    queryKey: liveClassesKeys.list(params),
    queryFn: () => listLiveClasses(params),
    placeholderData: keepPreviousData,
  })
}
