import type { ListTrainersParams } from '@/features/trainers/types'

export const trainersKeys = {
  list: (params: ListTrainersParams) => ['trainers', 'list', params] as const,
  detail: (id: string) => ['trainers', 'detail', id] as const,
  sessions: (id: string) => ['trainers', 'sessions', id] as const,
  auditLog: (id: string, page: number) => ['trainers', 'audit-log', id, page] as const,
}
