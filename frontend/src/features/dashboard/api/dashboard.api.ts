import { apiGet } from '@/shared/lib/api-client'
import type { AdminDashboard, AdminDashboardParams } from '@/features/dashboard/types'

/**
 * Every field/param here mirrors `backend/src/routes/dashboard.routes.ts`
 * and `backend/src/validators/dashboard.validator.ts` exactly. No component
 * calls `apiClient`/`apiGet` directly. Accepts an `AbortSignal` — TanStack
 * Query passes its own per-query-key signal into `queryFn`, so switching the
 * period selector cancels the now-stale in-flight request instead of
 * racing it against the new one.
 */
export function getAdminDashboard(
  params: AdminDashboardParams,
  signal?: AbortSignal,
): Promise<AdminDashboard> {
  return apiGet<AdminDashboard>('/dashboard/admin', { params, signal })
}
