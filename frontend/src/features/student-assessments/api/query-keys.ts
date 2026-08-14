export const studentAssessmentsKeys = {
  all: ['student-assessments'] as const,
  lists: () => [...studentAssessmentsKeys.all, 'list'] as const,
  detail: (id: string) => [...studentAssessmentsKeys.all, 'detail', id] as const,
  attempt: (attemptId: string) => [...studentAssessmentsKeys.all, 'attempt', attemptId] as const,
}
