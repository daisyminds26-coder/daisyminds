import { apiGet, apiPost } from '@/shared/lib/api-client'
import type { AdminLiveClass, ListLiveClassesParams } from '@/features/live-classes/types'

export type TrainerLiveClassesParams = Pick<
  ListLiveClassesParams,
  'batchId' | 'courseId' | 'status' | 'dateFrom' | 'dateTo'
>

/** Every function here mirrors `backend/src/routes/trainer-live-class.routes.ts` exactly — the self-scoped `/trainer/live-classes/*` namespace. Response shape is the same `AdminLiveClassDto` an admin sees (a trainer, like an admin, receives `hostUrl`), just filtered server-side to sessions the trainer is actually assigned to. */
export function listMyLiveClasses(params: TrainerLiveClassesParams): Promise<AdminLiveClass[]> {
  return apiGet<AdminLiveClass[]>('/trainer/live-classes', { params })
}

export function getMyLiveClass(id: string): Promise<AdminLiveClass> {
  return apiGet<AdminLiveClass>(`/trainer/live-classes/${id}`)
}

export function startMyLiveClass(id: string): Promise<AdminLiveClass> {
  return apiPost<AdminLiveClass>(`/trainer/live-classes/${id}/start`)
}

export function completeMyLiveClass(id: string): Promise<AdminLiveClass> {
  return apiPost<AdminLiveClass>(`/trainer/live-classes/${id}/complete`)
}
