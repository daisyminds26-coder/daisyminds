import {
  apiClient,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
  type ApiMeta,
} from '@/shared/lib/api-client'
import type {
  AdminAttendanceReportRow,
  BulkMarkAttendanceRecord,
  BulkMarkAttendanceResult,
  ListAttendanceParams,
  SessionAttendance,
} from '@/features/attendance/types'

/** Session-scoped roster/bulk-mark/finalize/reopen — mirrors the attendance sub-routes nested under `backend/src/routes/live-class.routes.ts`. Shared by both the admin (`/live-classes/*`) and trainer (`/trainer/live-classes/*`) callers via the `basePath` parameter, since the backend exposes the identical roster/bulk-mark shape on both namespaces after its own ownership check. */
export function getSessionRoster(
  sessionId: string,
  basePath = '/live-classes',
): Promise<SessionAttendance> {
  return apiGet<SessionAttendance>(`${basePath}/${sessionId}/attendance`)
}

export function bulkMarkAttendance(
  sessionId: string,
  records: BulkMarkAttendanceRecord[],
  basePath = '/live-classes',
): Promise<BulkMarkAttendanceResult> {
  return apiPatch<BulkMarkAttendanceResult>(`${basePath}/${sessionId}/attendance`, { records })
}

export function finalizeAttendance(sessionId: string): Promise<SessionAttendance> {
  return apiPost<SessionAttendance>(`/live-classes/${sessionId}/attendance/finalize`)
}

export function reopenAttendance(sessionId: string, reason: string): Promise<SessionAttendance> {
  return apiPost<SessionAttendance>(`/live-classes/${sessionId}/attendance/reopen`, { reason })
}

/** Cross-session admin report — mirrors `backend/src/routes/attendance.routes.ts`. */
export function listAttendanceReport(
  params: ListAttendanceParams,
): Promise<{ data: AdminAttendanceReportRow[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminAttendanceReportRow>('/attendance', { params })
}

export async function exportAttendanceCsv(
  params: Omit<ListAttendanceParams, 'page' | 'limit'>,
): Promise<Blob> {
  const response = await apiClient.get<Blob>('/attendance/export', { params, responseType: 'blob' })
  return response.data
}
