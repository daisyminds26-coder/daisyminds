import { useQuery } from '@tanstack/react-query'

import {
  listMyLiveClasses,
  type TrainerLiveClassesParams,
} from '@/features/trainer-live-classes/api/trainer-live-classes.api'
import { trainerLiveClassesKeys } from '@/features/trainer-live-classes/api/query-keys'

export function useMyLiveClasses(params: TrainerLiveClassesParams) {
  return useQuery({
    queryKey: trainerLiveClassesKeys.list(params),
    queryFn: () => listMyLiveClasses(params),
  })
}
