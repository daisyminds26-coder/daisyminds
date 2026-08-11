import type { ListBatchesParams } from '@/features/batches/types'

export const batchesKeys = {
  all: ['batches'] as const,
  list: (params: ListBatchesParams) => [...batchesKeys.all, 'list', params] as const,
  detail: (id: string) => [...batchesKeys.all, 'detail', id] as const,
  readiness: (id: string) => [...batchesKeys.all, 'readiness', id] as const,
  conflicts: (id: string) => [...batchesKeys.all, 'conflicts', id] as const,
  auditLog: (id: string, page: number) => [...batchesKeys.all, 'audit', id, page] as const,
  capacity: (id: string) => [...batchesKeys.all, 'capacity', id] as const,
  waitlist: (id: string) => [...batchesKeys.all, 'waitlist', id] as const,
}
