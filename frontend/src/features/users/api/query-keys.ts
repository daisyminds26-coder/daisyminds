import type { ListUsersParams } from '@/features/users/types'

export const usersKeys = {
  list: (params: ListUsersParams) => ['users', 'list', params] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  sessions: (id: string) => ['users', 'sessions', id] as const,
  auditLog: (id: string, page: number) => ['users', 'audit-log', id, page] as const,
  roles: ['roles'] as const,
}
