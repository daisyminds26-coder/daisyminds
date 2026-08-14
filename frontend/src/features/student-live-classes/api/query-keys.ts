export const studentLiveClassesKeys = {
  all: ['student-live-classes'] as const,
  list: () => [...studentLiveClassesKeys.all, 'list'] as const,
  detail: (id: string) => [...studentLiveClassesKeys.all, 'detail', id] as const,
  join: (id: string) => [...studentLiveClassesKeys.all, 'join', id] as const,
}
