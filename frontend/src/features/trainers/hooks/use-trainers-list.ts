import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listTrainers } from '@/features/trainers/api/trainers.api'
import { trainersKeys } from '@/features/trainers/api/query-keys'
import type { ListTrainersParams } from '@/features/trainers/types'

export function useTrainersList(params: ListTrainersParams) {
  return useQuery({
    queryKey: trainersKeys.list(params),
    queryFn: () => listTrainers(params),
    placeholderData: keepPreviousData,
  })
}
