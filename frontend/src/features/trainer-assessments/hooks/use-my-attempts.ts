import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getMyAttempt,
  gradeMyAttempt,
  listMyAttempts,
} from '@/features/trainer-assessments/api/trainer-assessments.api'
import { trainerAssessmentsKeys } from '@/features/trainer-assessments/api/query-keys'
import type { GradeAttemptPayload, ListAttemptsParams } from '@/features/assessments/types'

export function useMyAttemptsList(id: string, params: ListAttemptsParams) {
  return useQuery({
    queryKey: trainerAssessmentsKeys.attempts(id, params),
    queryFn: () => listMyAttempts(id, params),
    enabled: Boolean(id),
  })
}

export function useMyAttempt(attemptId: string | undefined) {
  return useQuery({
    queryKey: trainerAssessmentsKeys.attempt(attemptId ?? ''),
    queryFn: () => getMyAttempt(attemptId ?? ''),
    enabled: Boolean(attemptId),
  })
}

export function useGradeMyAttempt(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ attemptId, payload }: { attemptId: string; payload: GradeAttemptPayload }) =>
      gradeMyAttempt(attemptId, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData(trainerAssessmentsKeys.attempt(updated.id), updated)
      await queryClient.invalidateQueries({
        queryKey: trainerAssessmentsKeys.attemptsForAssessment(assessmentId),
      })
    },
  })
}
