import type { ListCoursesParams } from '@/features/courses/types'

export const coursesKeys = {
  all: ['courses'] as const,
  list: (params: ListCoursesParams) => [...coursesKeys.all, 'list', params] as const,
  detail: (id: string) => [...coursesKeys.all, 'detail', id] as const,
  readiness: (id: string) => [...coursesKeys.all, 'readiness', id] as const,
  auditLog: (id: string, page: number) => [...coursesKeys.all, 'audit', id, page] as const,
}
