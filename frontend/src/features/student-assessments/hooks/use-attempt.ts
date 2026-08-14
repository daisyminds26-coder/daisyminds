import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getMyAttempt,
  recordFocusLoss,
  saveAnswers,
  startAttempt,
  submitAttempt,
} from '@/features/student-assessments/api/student-assessments.api'
import { studentAssessmentsKeys } from '@/features/student-assessments/api/query-keys'
import type { AnswerEntryPayload } from '@/features/student-assessments/types'

export function useStartAttempt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: startAttempt,
    onSuccess: async (attempt) => {
      queryClient.setQueryData(studentAssessmentsKeys.attempt(attempt.id), attempt)
      await queryClient.invalidateQueries({ queryKey: studentAssessmentsKeys.lists() })
    },
  })
}

export function useMyAttempt(attemptId: string | undefined) {
  return useQuery({
    queryKey: studentAssessmentsKeys.attempt(attemptId ?? ''),
    queryFn: () => getMyAttempt(attemptId ?? ''),
    enabled: Boolean(attemptId),
    refetchOnWindowFocus: false,
  })
}

export function useSaveAnswers(attemptId: string) {
  return useMutation({
    mutationFn: (answers: AnswerEntryPayload[]) => saveAnswers(attemptId, answers),
  })
}

export function useSubmitAttempt(attemptId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => submitAttempt(attemptId),
    onSuccess: async (attempt) => {
      queryClient.setQueryData(studentAssessmentsKeys.attempt(attemptId), attempt)
      await queryClient.invalidateQueries({ queryKey: studentAssessmentsKeys.lists() })
    },
  })
}

export function useRecordFocusLoss(attemptId: string) {
  return useMutation({
    mutationFn: () => recordFocusLoss(attemptId),
  })
}
