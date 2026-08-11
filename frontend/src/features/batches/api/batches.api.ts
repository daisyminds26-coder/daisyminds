import {
  apiClient,
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
  type ApiMeta,
} from '@/shared/lib/api-client'
import type {
  AdminBatch,
  AdminBatchListItem,
  AuditLogEntry,
  BatchBulkAction,
  BatchBulkActionResult,
  BatchCapacitySnapshot,
  BatchDeliveryMode,
  CalendarExceptionType,
  DayOfWeek,
  ListBatchesParams,
  MeetingProvider,
  ReadinessResult,
  TrainerConflict,
  WaitlistEntry,
} from '@/features/batches/types'

/**
 * Every field/endpoint here mirrors `backend/src/routes/batch.routes.ts`
 * and `backend/src/validators/batch.validator.ts` exactly — see
 * `features/courses/api/courses.api.ts`'s comment for why input shapes stay
 * separate from the read-side DTOs in `features/batches/types` (the read
 * DTOs use `string | null` throughout; a request body naturally omits an
 * empty optional field instead of sending `null`).
 */
export interface WeeklyScheduleSlotInput {
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  sessionLabel?: string
  locationOverride?: string
  deliveryModeOverride?: BatchDeliveryMode
}

export interface CalendarExceptionInput {
  date: string
  type?: CalendarExceptionType
  title: string
  note?: string
}

export interface LocationInput {
  meetingProvider?: MeetingProvider
  virtualClassNotes?: string
  venueName?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  room?: string
  mapUrl?: string
}

export interface BatchProfileFields {
  courseId: string
  name: string
  shortName?: string
  description?: string
  startDate?: string
  endDate?: string
  enrollmentOpenDate?: string
  enrollmentCloseDate?: string
  timezone: string
  deliveryMode: BatchDeliveryMode
  primaryTrainerId?: string
  assistantTrainerIds?: string[]
  maxStudents: number
  minimumStudents?: number
  waitlistEnabled?: boolean
  location?: LocationInput
  weeklySchedule?: WeeklyScheduleSlotInput[]
  calendarExceptions?: CalendarExceptionInput[]
  tags?: string[]
  internalNotes?: string
}

export type CreateBatchPayload = BatchProfileFields
/** `courseId` is never part of an update — immutable after creation, matching `updateBatchSchema`'s `.omit({ courseId: true })`. */
export type UpdateBatchPayload = Partial<Omit<BatchProfileFields, 'courseId'>>

export interface AssignTrainersPayload {
  primaryTrainerId: string | null
  assistantTrainerIds: string[]
}

export interface DuplicateBatchPayload {
  name: string
  startDate?: string
  endDate?: string
}

export function listBatches(
  params: ListBatchesParams,
): Promise<{ data: AdminBatchListItem[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminBatchListItem>('/batches', { params })
}

export function getBatch(id: string): Promise<AdminBatch> {
  return apiGet<AdminBatch>(`/batches/${id}`)
}

export function createBatch(payload: CreateBatchPayload): Promise<AdminBatch> {
  return apiPost<AdminBatch>('/batches', payload)
}

export function updateBatch(id: string, payload: UpdateBatchPayload): Promise<AdminBatch> {
  return apiPatch<AdminBatch>(`/batches/${id}`, payload)
}

export function checkReadiness(id: string): Promise<ReadinessResult> {
  return apiPost<ReadinessResult>(`/batches/${id}/readiness-check`)
}

export function getConflicts(id: string): Promise<TrainerConflict[]> {
  return apiGet<TrainerConflict[]>(`/batches/${id}/conflicts`)
}

export function assignTrainers(id: string, payload: AssignTrainersPayload): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/trainers`, payload)
}

export function updateWeeklySchedule(
  id: string,
  weeklySchedule: WeeklyScheduleSlotInput[],
): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/weekly-schedule`, { weeklySchedule })
}

export function updateCalendarExceptions(
  id: string,
  calendarExceptions: CalendarExceptionInput[],
): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/calendar-exceptions`, { calendarExceptions })
}

export function scheduleBatch(id: string): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/lifecycle/schedule`)
}

export function unscheduleBatch(id: string): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/lifecycle/unschedule`)
}

export function activateBatch(id: string): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/lifecycle/activate`)
}

export function completeBatch(id: string): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/lifecycle/complete`)
}

export function cancelBatch(id: string): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/lifecycle/cancel`)
}

export function archiveBatch(id: string): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/lifecycle/archive`)
}

export function restoreBatch(id: string): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/lifecycle/restore`)
}

export function softDeleteBatch(id: string): Promise<null> {
  return apiDelete<null>(`/batches/${id}`)
}

export function duplicateBatch(id: string, payload: DuplicateBatchPayload): Promise<AdminBatch> {
  return apiPost<AdminBatch>(`/batches/${id}/duplicate`, payload)
}

export function bulkAction(
  action: BatchBulkAction,
  batchIds: string[],
): Promise<BatchBulkActionResult> {
  return apiPost<BatchBulkActionResult>(`/batches/bulk/${action}`, { action, batchIds })
}

export function getAuditLog(
  id: string,
  page: number,
  limit = 20,
): Promise<{ data: AuditLogEntry[]; meta: ApiMeta }> {
  return apiGetPaginated<AuditLogEntry>(`/batches/${id}/audit`, { params: { page, limit } })
}

export async function exportBatchesCsv(
  params: Omit<ListBatchesParams, 'page' | 'limit'>,
): Promise<Blob> {
  const response = await apiClient.get<Blob>('/batches/export', {
    params,
    responseType: 'blob',
  })
  return response.data
}

/** Phase 10B — server-managed derived capacity; read-only here, `maxStudents` is the only client-configurable half (see `UpdateBatchPayload`). */
export function getBatchCapacity(id: string): Promise<BatchCapacitySnapshot> {
  return apiGet<BatchCapacitySnapshot>(`/batches/${id}/capacity`)
}

export function getBatchWaitlist(id: string): Promise<WaitlistEntry[]> {
  return apiGet<WaitlistEntry[]>(`/batches/${id}/waitlist`)
}
