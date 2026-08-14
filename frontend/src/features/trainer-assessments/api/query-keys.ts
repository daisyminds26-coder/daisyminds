import type { ListAttemptsParams } from '@/features/assessments/types'

export const trainerAssessmentsKeys = {
  all: ['trainer-assessments'] as const,
  lists: () => [...trainerAssessmentsKeys.all, 'list'] as const,
  detail: (id: string) => [...trainerAssessmentsKeys.all, 'detail', id] as const,
  attemptsForAssessment: (id: string) => [...trainerAssessmentsKeys.all, 'attempts', id] as const,
  attempts: (id: string, params: ListAttemptsParams) =>
    [...trainerAssessmentsKeys.attemptsForAssessment(id), params] as const,
  attempt: (attemptId: string) => [...trainerAssessmentsKeys.all, 'attempt', attemptId] as const,
}
