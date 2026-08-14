import type { ListAssignmentsParams, ListSubmissionsParams } from '@/features/assignments/types'

export const assignmentsKeys = {
  all: ['assignments'] as const,
  lists: () => [...assignmentsKeys.all, 'list'] as const,
  list: (params: ListAssignmentsParams) => [...assignmentsKeys.lists(), params] as const,
  detail: (id: string) => [...assignmentsKeys.all, 'detail', id] as const,
  submissions: (assignmentId: string, params: ListSubmissionsParams) =>
    [...assignmentsKeys.all, 'submissions', assignmentId, params] as const,
  submission: (assignmentId: string, submissionId: string) =>
    [...assignmentsKeys.all, 'submission', assignmentId, submissionId] as const,
  history: (assignmentId: string, studentId: string) =>
    [...assignmentsKeys.all, 'history', assignmentId, studentId] as const,
}
