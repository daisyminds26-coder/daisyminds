import { useQuery } from '@tanstack/react-query'

import { getTrainer } from '@/features/trainers/api/trainers.api'
import { trainersKeys } from '@/features/trainers/api/query-keys'

export function useTrainer(id: string | undefined) {
  return useQuery({
    queryKey: trainersKeys.detail(id ?? ''),
    queryFn: () => getTrainer(id ?? ''),
    enabled: !!id,
  })
}
