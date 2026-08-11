import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getAdminDashboard } from '@/features/dashboard/api/dashboard.api'
import { dashboardKeys } from '@/features/dashboard/api/query-keys'
import type { AdminDashboardParams } from '@/features/dashboard/types'

/**
 * `keepPreviousData` so switching the period selector never blanks the
 * dashboard mid-fetch — the previous period's numbers stay visible
 * (slightly stale, per `isFetching`) until the new ones land. `enabled`
 * lets the page hold off fetching while a `CUSTOM` range's start/end dates
 * are still incomplete, instead of firing a request the backend would
 * reject with a 400.
 */
export function useAdminDashboard(params: AdminDashboardParams, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.admin(params),
    queryFn: ({ signal }) => getAdminDashboard(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}
