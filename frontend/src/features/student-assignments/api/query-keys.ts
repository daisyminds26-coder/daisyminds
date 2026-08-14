export const studentAssignmentsKeys = {
  all: ['student-assignments'] as const,
  list: () => [...studentAssignmentsKeys.all, 'list'] as const,
  detail: (id: string) => [...studentAssignmentsKeys.all, 'detail', id] as const,
  history: (id: string) => [...studentAssignmentsKeys.all, 'history', id] as const,
}
