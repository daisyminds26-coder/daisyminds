import type { ListAssessmentsParams, ListAttemptsParams } from '@/features/assessments/types'

export const assessmentsKeys = {
  all: ['assessments'] as const,
  lists: () => [...assessmentsKeys.all, 'list'] as const,
  list: (params: ListAssessmentsParams) => [...assessmentsKeys.lists(), params] as const,
  detail: (id: string) => [...assessmentsKeys.all, 'detail', id] as const,
  readiness: (id: string) => [...assessmentsKeys.all, 'readiness', id] as const,
  attemptsForAssessment: (id: string) => [...assessmentsKeys.all, 'attempts', id] as const,
  attempts: (id: string, params: ListAttemptsParams) =>
    [...assessmentsKeys.attemptsForAssessment(id), params] as const,
  attempt: (id: string, attemptId: string) =>
    [...assessmentsKeys.all, 'attempt', id, attemptId] as const,
  results: (id: string) => [...assessmentsKeys.all, 'results', id] as const,
}
