import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  generateFromTimetable,
  previewGeneration,
} from '@/features/live-classes/api/live-classes.api'
import { liveClassesKeys } from '@/features/live-classes/api/query-keys'

export function useGenerationPreview(
  params: { batchId: string; startDate: string; endDate: string } | null,
) {
  return useQuery({
    queryKey: liveClassesKeys.preview(
      params?.batchId ?? '',
      params?.startDate ?? '',
      params?.endDate ?? '',
    ),
    queryFn: () => previewGeneration(params ?? { batchId: '', startDate: '', endDate: '' }),
    enabled: Boolean(params),
  })
}

export function useGenerateFromTimetable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateFromTimetable,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: liveClassesKeys.lists() })
    },
  })
}
