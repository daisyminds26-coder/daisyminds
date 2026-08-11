import type { Request, Response } from 'express'

import { sendSuccess } from '../utils/api-response'
import { dashboardService } from '../services/dashboard.service'
import type { AdminDashboardQuery } from '../validators/dashboard.validator'

/**
 * Permission-aware response shaping, not a second endpoint: `ADMIN` holds
 * `dashboard:read` (same as `SUPER_ADMIN`) and gets the full operational
 * dashboard, but `recentActivity` (the audit-derived feed) is included only
 * for `SUPER_ADMIN` — mirroring the exact same `requireRole('SUPER_ADMIN')`
 * carve-out the students/trainers modules use for sessions/audit access,
 * rather than inventing a separate `dashboard.admin.audit.read` permission.
 */
export async function getAdminDashboard(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as AdminDashboardQuery

  const data = await dashboardService.getAdminDashboard({
    range: query.range,
    startDate: query.startDate,
    endDate: query.endDate,
    timezone: query.timezone,
    includeActivity: req.user?.role === 'SUPER_ADMIN',
  })

  sendSuccess(res, { data })
}
