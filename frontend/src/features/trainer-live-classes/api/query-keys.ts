import type { ListLiveClassesParams } from '@/features/live-classes/types'

export const trainerLiveClassesKeys = {
  all: ['trainer-live-classes'] as const,
  list: (
    params: Pick<ListLiveClassesParams, 'batchId' | 'courseId' | 'status' | 'dateFrom' | 'dateTo'>,
  ) => [...trainerLiveClassesKeys.all, 'list', params] as const,
  detail: (id: string) => [...trainerLiveClassesKeys.all, 'detail', id] as const,
}
