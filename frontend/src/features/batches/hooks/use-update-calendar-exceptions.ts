import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  updateCalendarExceptions,
  type CalendarExceptionInput,
} from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'

/** Whole-array-replace PUT semantics — "save" replaces the full exceptions list, matching the backend contract. */
export function useUpdateCalendarExceptions(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (calendarExceptions: CalendarExceptionInput[]) =>
      updateCalendarExceptions(id, calendarExceptions),
    onSuccess: (updated) => {
      queryClient.setQueryData(batchesKeys.detail(id), updated)
    },
  })
}
