import type { ListEnrollmentsParams } from '@/features/enrollments/types'

export const enrollmentsKeys = {
  all: ['enrollments'] as const,
  list: (params: ListEnrollmentsParams) => [...enrollmentsKeys.all, 'list', params] as const,
  detail: (id: string) => [...enrollmentsKeys.all, 'detail', id] as const,
  auditLog: (id: string, page: number) => [...enrollmentsKeys.all, 'audit', id, page] as const,
}
