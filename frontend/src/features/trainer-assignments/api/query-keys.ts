import type { ListSubmissionsParams } from '@/features/assignments/types'

export const trainerAssignmentsKeys = {
  all: ['trainer-assignments'] as const,
  list: () => [...trainerAssignmentsKeys.all, 'list'] as const,
  detail: (id: string) => [...trainerAssignmentsKeys.all, 'detail', id] as const,
  submissions: (id: string, params: ListSubmissionsParams) =>
    [...trainerAssignmentsKeys.all, 'submissions', id, params] as const,
  history: (id: string, studentId: string) =>
    [...trainerAssignmentsKeys.all, 'history', id, studentId] as const,
}
