import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getMyAssignment,
  getMyAttemptHistory,
  getMySubmission,
  gradeMySubmission,
  listMyAssignments,
  listMySubmissions,
  returnMySubmission,
} from '@/features/trainer-assignments/api/trainer-assignments.api'
import { trainerAssignmentsKeys } from '@/features/trainer-assignments/api/query-keys'
import type { GradeSubmissionPayload, ListSubmissionsParams } from '@/features/assignments/types'

export function useMyAssignments() {
  return useQuery({ queryKey: trainerAssignmentsKeys.list(), queryFn: listMyAssignments })
}

export function useMyAssignment(id: string | undefined) {
  return useQuery({
    queryKey: trainerAssignmentsKeys.detail(id ?? ''),
    queryFn: () => getMyAssignment(id ?? ''),
    enabled: Boolean(id),
  })
}

export function useMySubmissionsList(id: string, params: ListSubmissionsParams) {
  return useQuery({
    queryKey: trainerAssignmentsKeys.submissions(id, params),
    queryFn: () => listMySubmissions(id, params),
  })
}

export function useMySubmission(id: string, submissionId: string | undefined) {
  return useQuery({
    queryKey: [...trainerAssignmentsKeys.detail(id), 'submission', submissionId ?? ''],
    queryFn: () => getMySubmission(id, submissionId ?? ''),
    enabled: Boolean(submissionId),
  })
}

export function useMyAttemptHistory(id: string, studentId: string | undefined) {
  return useQuery({
    queryKey: trainerAssignmentsKeys.history(id, studentId ?? ''),
    queryFn: () => getMyAttemptHistory(id, studentId ?? ''),
    enabled: Boolean(studentId),
  })
}

export function useGradeMySubmission(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      submissionId,
      payload,
    }: {
      submissionId: string
      payload: GradeSubmissionPayload
    }) => gradeMySubmission(assignmentId, submissionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trainerAssignmentsKeys.all })
    },
  })
}

export function useReturnMySubmission(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: string; reason: string }) =>
      returnMySubmission(assignmentId, submissionId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trainerAssignmentsKeys.all })
    },
  })
}
