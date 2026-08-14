import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getAttempt, gradeAttempt, listAttempts } from '@/features/assessments/api/assessments.api'
import { assessmentsKeys } from '@/features/assessments/api/query-keys'
import type { GradeAttemptPayload, ListAttemptsParams } from '@/features/assessments/types'

export function useAttemptsList(id: string, params: ListAttemptsParams) {
  return useQuery({
    queryKey: assessmentsKeys.attempts(id, params),
    queryFn: () => listAttempts(id, params),
    enabled: Boolean(id),
  })
}

export function useAttempt(id: string, attemptId: string | undefined) {
  return useQuery({
    queryKey: assessmentsKeys.attempt(id, attemptId ?? ''),
    queryFn: () => getAttempt(id, attemptId ?? ''),
    enabled: Boolean(id) && Boolean(attemptId),
  })
}

export function useGradeAttempt(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ attemptId, payload }: { attemptId: string; payload: GradeAttemptPayload }) =>
      gradeAttempt(id, attemptId, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData(assessmentsKeys.attempt(id, updated.id), updated)
      await queryClient.invalidateQueries({ queryKey: assessmentsKeys.attemptsForAssessment(id) })
      await queryClient.invalidateQueries({ queryKey: assessmentsKeys.results(id) })
    },
  })
}
