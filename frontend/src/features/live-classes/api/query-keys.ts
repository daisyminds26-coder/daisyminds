import type { ListLiveClassesParams } from '@/features/live-classes/types'

export const liveClassesKeys = {
  all: ['live-classes'] as const,
  lists: () => [...liveClassesKeys.all, 'list'] as const,
  list: (params: ListLiveClassesParams) => [...liveClassesKeys.lists(), params] as const,
  detail: (id: string) => [...liveClassesKeys.all, 'detail', id] as const,
  preview: (batchId: string, startDate: string, endDate: string) =>
    [...liveClassesKeys.all, 'preview', batchId, startDate, endDate] as const,
}
