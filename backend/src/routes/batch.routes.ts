import { Router } from 'express'

import * as batchController from '../controllers/batch.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  assignTrainersSchema,
  batchBulkActionSchema,
  batchIdParamSchema,
  calendarExceptionsBodySchema,
  createBatchSchema,
  duplicateBatchSchema,
  exportBatchesQuerySchema,
  listBatchesQuerySchema,
  paginationQuerySchema,
  updateBatchSchema,
  weeklyScheduleBodySchema,
} from '../validators/batch.validator'

export const batchRouter = Router()

/** No public routes — protect once, matching `/courses`/`/students`/`/trainers` (API-STANDARDS.md §6). */
batchRouter.use(requireAuth)

const READ = requirePermission('batches:read')
const MANAGE = requirePermission('batches:manage')
const EXPORT = requirePermission('batches:export')

// Order matters: `/export` and `/bulk/*` must be registered before the `/:id` param route.
batchRouter.get(
  '/export',
  EXPORT,
  validate({ query: exportBatchesQuerySchema }),
  asyncHandler(batchController.exportBatches),
)
batchRouter.post(
  '/bulk/archive',
  MANAGE,
  validate({ body: batchBulkActionSchema }),
  asyncHandler(batchController.bulkAction),
)
batchRouter.post(
  '/bulk/cancel',
  MANAGE,
  validate({ body: batchBulkActionSchema }),
  asyncHandler(batchController.bulkAction),
)
batchRouter.post(
  '/bulk/delete',
  MANAGE,
  validate({ body: batchBulkActionSchema }),
  asyncHandler(batchController.bulkAction),
)

batchRouter.get(
  '/',
  READ,
  validate({ query: listBatchesQuerySchema }),
  asyncHandler(batchController.listBatches),
)
batchRouter.post(
  '/',
  MANAGE,
  validate({ body: createBatchSchema }),
  asyncHandler(batchController.createBatch),
)

batchRouter.get(
  '/:id',
  READ,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.getBatch),
)
batchRouter.patch(
  '/:id',
  MANAGE,
  validate({ params: batchIdParamSchema, body: updateBatchSchema }),
  asyncHandler(batchController.updateBatch),
)
batchRouter.delete(
  '/:id',
  MANAGE,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.softDeleteBatch),
)

batchRouter.post(
  '/:id/readiness-check',
  READ,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.checkReadiness),
)
batchRouter.get(
  '/:id/conflicts',
  READ,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.getConflicts),
)

// POST, not PUT — this project's API-STANDARDS.md §2 does not use PUT
// anywhere ("PATCH only, to avoid full-document-replace footguns"); a
// whole-array/whole-resource replace is instead modeled as a POST action on
// a named sub-resource, the same "compact, whole-set, never partial"
// contract Phase 9B's reorder endpoints established (API-STANDARDS.md §4).
batchRouter.post(
  '/:id/trainers',
  MANAGE,
  validate({ params: batchIdParamSchema, body: assignTrainersSchema }),
  asyncHandler(batchController.assignTrainers),
)
batchRouter.post(
  '/:id/weekly-schedule',
  MANAGE,
  validate({ params: batchIdParamSchema, body: weeklyScheduleBodySchema }),
  asyncHandler(batchController.updateWeeklySchedule),
)
batchRouter.post(
  '/:id/calendar-exceptions',
  MANAGE,
  validate({ params: batchIdParamSchema, body: calendarExceptionsBodySchema }),
  asyncHandler(batchController.updateCalendarExceptions),
)

// Lifecycle transitions live under `/lifecycle/*` — deliberately distinct
// from `/weekly-schedule` (the recurring timetable) to avoid the naming
// collision a bare `/schedule` route would create between "mark this batch
// SCHEDULED" and "set the weekly timetable" (see ARCHITECTURE.md).
batchRouter.post(
  '/:id/lifecycle/schedule',
  MANAGE,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.scheduleBatch),
)
batchRouter.post(
  '/:id/lifecycle/unschedule',
  MANAGE,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.unscheduleBatch),
)
batchRouter.post(
  '/:id/lifecycle/activate',
  MANAGE,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.activateBatch),
)
batchRouter.post(
  '/:id/lifecycle/complete',
  MANAGE,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.completeBatch),
)
batchRouter.post(
  '/:id/lifecycle/cancel',
  MANAGE,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.cancelBatch),
)
batchRouter.post(
  '/:id/lifecycle/archive',
  MANAGE,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.archiveBatch),
)
batchRouter.post(
  '/:id/lifecycle/restore',
  MANAGE,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.restoreBatch),
)

batchRouter.post(
  '/:id/duplicate',
  MANAGE,
  validate({ params: batchIdParamSchema, body: duplicateBatchSchema }),
  asyncHandler(batchController.duplicateBatch),
)

batchRouter.get(
  '/:id/audit',
  MANAGE,
  validate({ params: batchIdParamSchema, query: paginationQuerySchema }),
  asyncHandler(batchController.getAuditTimeline),
)

/** Phase 10B — server-managed derived state, read-only here; only `enrollment-capacity.service.ts` ever mutates it. */
batchRouter.get(
  '/:id/capacity',
  READ,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.getBatchCapacity),
)
batchRouter.get(
  '/:id/waitlist',
  READ,
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.getBatchWaitlist),
)
/** Maintenance-only diagnostic — deliberately `requireRole('SUPER_ADMIN')` rather than `batches:manage`, matching this app's existing stricter-than-module-permission carve-out for sensitive operational actions (SECURITY.md §3). */
batchRouter.post(
  '/:id/capacity/reconcile',
  requireRole('SUPER_ADMIN'),
  validate({ params: batchIdParamSchema }),
  asyncHandler(batchController.reconcileBatchCapacity),
)
