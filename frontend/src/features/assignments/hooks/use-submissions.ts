import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getAttemptHistory,
  getSubmission,
  gradeSubmission,
  listSubmissions,
  returnSubmission,
} from '@/features/assignments/api/assignments.api'
import { assignmentsKeys } from '@/features/assignments/api/query-keys'
import type { GradeSubmissionPayload, ListSubmissionsParams } from '@/features/assignments/types'

export function useSubmissionsList(assignmentId: string, params: ListSubmissionsParams) {
  return useQuery({
    queryKey: assignmentsKeys.submissions(assignmentId, params),
    queryFn: () => listSubmissions(assignmentId, params),
  })
}

export function useSubmission(assignmentId: string, submissionId: string | undefined) {
  return useQuery({
    queryKey: assignmentsKeys.submission(assignmentId, submissionId ?? ''),
    queryFn: () => getSubmission(assignmentId, submissionId ?? ''),
    enabled: Boolean(submissionId),
  })
}

export function useAttemptHistory(assignmentId: string, studentId: string | undefined) {
  return useQuery({
    queryKey: assignmentsKeys.history(assignmentId, studentId ?? ''),
    queryFn: () => getAttemptHistory(assignmentId, studentId ?? ''),
    enabled: Boolean(studentId),
  })
}

export function useGradeSubmission(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      submissionId,
      payload,
    }: {
      submissionId: string
      payload: GradeSubmissionPayload
    }) => gradeSubmission(assignmentId, submissionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: assignmentsKeys.all })
    },
  })
}

export function useReturnSubmission(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: string; reason: string }) =>
      returnSubmission(assignmentId, submissionId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: assignmentsKeys.all })
    },
  })
}
