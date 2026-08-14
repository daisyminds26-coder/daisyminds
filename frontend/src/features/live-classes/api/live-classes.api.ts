import { apiGet, apiGetPaginated, apiPatch, apiPost, type ApiMeta } from '@/shared/lib/api-client'
import type {
  AdminLiveClass,
  CreateLiveClassPayload,
  GeneratedOccurrencePreview,
  GenerateLiveClassesResult,
  ListLiveClassesParams,
} from '@/features/live-classes/types'

/** Every function here mirrors `backend/src/routes/live-class.routes.ts` exactly — the admin `/live-classes/*` namespace. */
export function listLiveClasses(
  params: ListLiveClassesParams,
): Promise<{ data: AdminLiveClass[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminLiveClass>('/live-classes', { params })
}

export function getLiveClass(id: string): Promise<AdminLiveClass> {
  return apiGet<AdminLiveClass>(`/live-classes/${id}`)
}

export function createLiveClass(payload: CreateLiveClassPayload): Promise<AdminLiveClass> {
  return apiPost<AdminLiveClass>('/live-classes', payload)
}

export function updateLiveClass(
  id: string,
  payload: Partial<CreateLiveClassPayload>,
): Promise<AdminLiveClass> {
  return apiPatch<AdminLiveClass>(`/live-classes/${id}`, payload)
}

export function scheduleLiveClass(id: string): Promise<AdminLiveClass> {
  return apiPost<AdminLiveClass>(`/live-classes/${id}/schedule`)
}

export function startLiveClass(id: string): Promise<AdminLiveClass> {
  return apiPost<AdminLiveClass>(`/live-classes/${id}/start`)
}

export function completeLiveClass(id: string): Promise<AdminLiveClass> {
  return apiPost<AdminLiveClass>(`/live-classes/${id}/complete`)
}

export function cancelLiveClass(id: string, reason: string): Promise<AdminLiveClass> {
  return apiPost<AdminLiveClass>(`/live-classes/${id}/cancel`, { reason })
}

export function previewGeneration(params: {
  batchId: string
  startDate: string
  endDate: string
}): Promise<GeneratedOccurrencePreview[]> {
  return apiPost<GeneratedOccurrencePreview[]>('/live-classes/generate/preview', params)
}

export function generateFromTimetable(params: {
  batchId: string
  startDate: string
  endDate: string
  scheduledDates?: string[]
}): Promise<GenerateLiveClassesResult> {
  return apiPost<GenerateLiveClassesResult>('/live-classes/generate', params)
}
