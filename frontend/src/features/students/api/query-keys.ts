import type { ListStudentsParams } from '@/features/students/types'

export const studentsKeys = {
  list: (params: ListStudentsParams) => ['students', 'list', params] as const,
  detail: (id: string) => ['students', 'detail', id] as const,
  sessions: (id: string) => ['students', 'sessions', id] as const,
  auditLog: (id: string, page: number) => ['students', 'audit-log', id, page] as const,
}
