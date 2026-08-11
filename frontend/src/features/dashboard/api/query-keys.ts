import type { AdminDashboardParams } from '@/features/dashboard/types'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  admin: (params: AdminDashboardParams) => [...dashboardKeys.all, 'admin', params] as const,
}
