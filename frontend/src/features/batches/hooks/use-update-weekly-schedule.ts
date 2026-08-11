import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  updateWeeklySchedule,
  type WeeklyScheduleSlotInput,
} from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'

/** Whole-array-replace PUT semantics — "save" replaces the full weekly schedule, matching the backend contract. */
export function useUpdateWeeklySchedule(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (weeklySchedule: WeeklyScheduleSlotInput[]) =>
      updateWeeklySchedule(id, weeklySchedule),
    onSuccess: (updated) => {
      queryClient.setQueryData(batchesKeys.detail(id), updated)
    },
  })
}
