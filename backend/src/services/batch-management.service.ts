import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { toCsv } from '../utils/csv'
import { canTransition } from '../utils/batch-lifecycle.util'
import { auditLogRepository } from '../repositories/audit-log.repository'
import { courseRepository } from '../repositories/course.repository'
import { trainerRepository } from '../repositories/trainer.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import {
  batchRepository,
  type ListBatchesFilter,
  type ListBatchesOptions,
} from '../repositories/batch.repository'
import { generateBatchCode } from './batch-id.service'
import { batchReadinessService, type ReadinessResult } from './batch-readiness.service'
import { batchConflictService, type TrainerConflict } from './batch-conflict.service'
import { CourseModel } from '../models/course.model'
import { TrainerModel } from '../models/trainer.model'
import type {
  BatchDeliveryMode,
  BatchDocument,
  BatchStatus,
  IBatchLocation,
  ICalendarException,
  IWeeklyScheduleSlot,
} from '../models/batch.model'
import type {
  AssignTrainersInput,
  BatchBulkAction,
  CalendarExceptionsInput,
  CreateBatchInput,
  DuplicateBatchInput,
  LocationInput,
  UpdateBatchInput,
  WeeklyScheduleInput,
} from '../validators/batch.validator'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

const MAX_EXPORT_ROWS = 5000

export interface WeeklyScheduleSlotDto {
  dayOfWeek: string
  startTime: string
  endTime: string
  sessionLabel: string | null
  locationOverride: string | null
  deliveryModeOverride: BatchDeliveryMode | null
}

export interface CalendarExceptionDto {
  date: string
  type: string
  title: string
  note: string | null
}

export interface LocationDto {
  meetingProvider: string | null
  virtualClassNotes: string | null
  venueName: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  room: string | null
  mapUrl: string | null
}

export interface AdminBatchListItemDto {
  id: string
  batchCode: string
  name: string
  shortName: string | null
  courseId: string
  startDate: string | null
  endDate: string | null
  timezone: string
  deliveryMode: BatchDeliveryMode
  status: BatchStatus
  primaryTrainerId: string | null
  maxStudents: number
  /** Server-managed derived state (Phase 10B) — never client-writable. See `enrollment-capacity.service.ts`. */
  occupiedSeats: number
  availableSeats: number
  waitlistEnabled: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminBatchDto extends AdminBatchListItemDto {
  description: string
  enrollmentOpenDate: string | null
  enrollmentCloseDate: string | null
  assistantTrainerIds: string[]
  minimumStudents: number | null
  location: LocationDto
  weeklySchedule: WeeklyScheduleSlotDto[]
  calendarExceptions: CalendarExceptionDto[]
  tags: string[]
  internalNotes: string | null
  scheduledAt: string | null
  activatedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  archivedAt: string | null
}

export interface BatchBulkActionResult {
  succeeded: string[]
  failed: { id: string; reason: string }[]
}

function toWeeklyScheduleDto(slot: IWeeklyScheduleSlot): WeeklyScheduleSlotDto {
  return {
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    sessionLabel: slot.sessionLabel,
    locationOverride: slot.locationOverride,
    deliveryModeOverride: slot.deliveryModeOverride,
  }
}

function toCalendarExceptionDto(exception: ICalendarException): CalendarExceptionDto {
  return {
    date: exception.date.toISOString(),
    type: exception.type,
    title: exception.title,
    note: exception.note,
  }
}

function toListItemDto(batch: BatchDocument): AdminBatchListItemDto {
  return {
    id: batch._id.toString(),
    batchCode: batch.batchCode,
    name: batch.name,
    shortName: batch.shortName,
    courseId: batch.courseId.toString(),
    startDate: batch.startDate ? batch.startDate.toISOString() : null,
    endDate: batch.endDate ? batch.endDate.toISOString() : null,
    timezone: batch.timezone,
    deliveryMode: batch.deliveryMode,
    status: batch.status,
    primaryTrainerId: batch.primaryTrainerId ? batch.primaryTrainerId.toString() : null,
    maxStudents: batch.maxStudents,
    occupiedSeats: batch.occupiedSeats,
    availableSeats: Math.max(0, batch.maxStudents - batch.occupiedSeats),
    waitlistEnabled: batch.waitlistEnabled,
    isDeleted: batch.isDeleted,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  }
}

function toDto(batch: BatchDocument): AdminBatchDto {
  return {
    ...toListItemDto(batch),
    description: batch.description,
    enrollmentOpenDate: batch.enrollmentOpenDate ? batch.enrollmentOpenDate.toISOString() : null,
    enrollmentCloseDate: batch.enrollmentCloseDate ? batch.enrollmentCloseDate.toISOString() : null,
    assistantTrainerIds: batch.assistantTrainerIds.map((id) => id.toString()),
    minimumStudents: batch.minimumStudents,
    location: {
      meetingProvider: batch.location.meetingProvider,
      virtualClassNotes: batch.location.virtualClassNotes,
      venueName: batch.location.venueName,
      addressLine1: batch.location.addressLine1,
      addressLine2: batch.location.addressLine2,
      city: batch.location.city,
      state: batch.location.state,
      postalCode: batch.location.postalCode,
      country: batch.location.country,
      room: batch.location.room,
      mapUrl: batch.location.mapUrl,
    },
    weeklySchedule: batch.weeklySchedule.map(toWeeklyScheduleDto),
    calendarExceptions: batch.calendarExceptions.map(toCalendarExceptionDto),
    tags: batch.tags,
    internalNotes: batch.internalNotes,
    scheduledAt: batch.scheduledAt ? batch.scheduledAt.toISOString() : null,
    activatedAt: batch.activatedAt ? batch.activatedAt.toISOString() : null,
    completedAt: batch.completedAt ? batch.completedAt.toISOString() : null,
    cancelledAt: batch.cancelledAt ? batch.cancelledAt.toISOString() : null,
    archivedAt: batch.archivedAt ? batch.archivedAt.toISOString() : null,
  }
}

async function assertCourseUsable(courseId: string): Promise<void> {
  const course = await courseRepository.findById(courseId)
  if (!course) {
    throw ApiError.badRequest('Course not found', [
      { field: 'courseId', message: 'Course not found' },
    ])
  }
}

async function assertTrainersExist(trainerIds: string[]): Promise<void> {
  if (trainerIds.length === 0) return
  const uniqueIds = [...new Set(trainerIds)]
  const count = await trainerRepository.countExisting(uniqueIds)
  if (count !== uniqueIds.length) {
    throw ApiError.badRequest('One or more assigned trainers do not exist', [
      { field: 'primaryTrainerId', message: 'All assigned trainers must exist' },
    ])
  }
}

function requireTransition(from: BatchStatus, to: BatchStatus): void {
  if (!canTransition(from, to)) {
    throw ApiError.conflict(`A batch cannot move from ${from} to ${to}`)
  }
}

async function recordAudit(
  action: string,
  batchId: Types.ObjectId | string,
  actor: AuthenticatedUser,
  context: RequestContext,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await auditLogRepository.record({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityType: 'batch',
    entityId: batchId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

/** Same `undefined` → `null` normalization as `normalizeLocation`, for the optional per-slot fields the validator leaves unset. */
function normalizeWeeklySchedule(slots: WeeklyScheduleInput): IWeeklyScheduleSlot[] {
  return slots.map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    sessionLabel: slot.sessionLabel ?? null,
    locationOverride: slot.locationOverride ?? null,
    deliveryModeOverride: slot.deliveryModeOverride ?? null,
  }))
}

function normalizeCalendarExceptions(exceptions: CalendarExceptionsInput): ICalendarException[] {
  return exceptions.map((exception) => ({
    date: exception.date,
    type: exception.type,
    title: exception.title,
    note: exception.note ?? null,
  }))
}

/** The validator leaves unset location fields as `undefined`; the schema stores every field as `null` by default. Fills each gap explicitly rather than relying on Mongoose's own defaulting, since the value also has to satisfy `IBatchLocation` at the TypeScript level before it ever reaches Mongoose. */
function normalizeLocation(location: LocationInput | undefined): IBatchLocation {
  return {
    meetingProvider: location?.meetingProvider ?? null,
    virtualClassNotes: location?.virtualClassNotes ?? null,
    venueName: location?.venueName ?? null,
    addressLine1: location?.addressLine1 ?? null,
    addressLine2: location?.addressLine2 ?? null,
    city: location?.city ?? null,
    state: location?.state ?? null,
    postalCode: location?.postalCode ?? null,
    country: location?.country ?? null,
    room: location?.room ?? null,
    mapUrl: location?.mapUrl ?? null,
  }
}

function locationChanged(
  a: BatchDocument['location'],
  b: Partial<BatchDocument['location']> | undefined,
): boolean {
  if (!b) return false
  return (Object.keys(b) as (keyof BatchDocument['location'])[]).some((key) => a[key] !== b[key])
}

export const batchManagementService = {
  async listBatches(
    filter: ListBatchesFilter,
    options: ListBatchesOptions,
  ): Promise<{ dtos: AdminBatchListItemDto[]; total: number }> {
    const { rows, total } = await batchRepository.list(filter, options)
    return { dtos: rows.map(toListItemDto), total }
  },

  async exportBatchesCsv(
    filter: ListBatchesFilter,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<string> {
    const rows = await batchRepository.listAllForExport(filter, MAX_EXPORT_ROWS)

    const courseIds = [...new Set(rows.map((row) => row.courseId.toString()))]
    const trainerIds = [
      ...new Set(
        rows
          .filter((row) => row.primaryTrainerId)
          .map((row) => row.primaryTrainerId?.toString() ?? ''),
      ),
    ]
    const [courses, trainers] = await Promise.all([
      CourseModel.find({ _id: { $in: courseIds } }),
      TrainerModel.find({ _id: { $in: trainerIds } }),
    ])
    const courseById = new Map(courses.map((course) => [course._id.toString(), course]))
    const trainerById = new Map(trainers.map((trainer) => [trainer._id.toString(), trainer]))

    const columns = [
      'Batch Code',
      'Name',
      'Course Code',
      'Course Title',
      'Start Date',
      'End Date',
      'Timezone',
      'Delivery Mode',
      'Primary Trainer',
      'Maximum Capacity',
      'Waitlist Enabled',
      'Status',
      'Created At',
    ]
    const csvRows = rows.map((batch) => {
      const course = courseById.get(batch.courseId.toString())
      const trainer = batch.primaryTrainerId
        ? trainerById.get(batch.primaryTrainerId.toString())
        : undefined
      return [
        batch.batchCode,
        batch.name,
        course?.courseCode ?? '',
        course?.title ?? '',
        batch.startDate ? batch.startDate.toISOString() : '',
        batch.endDate ? batch.endDate.toISOString() : '',
        batch.timezone,
        batch.deliveryMode,
        trainer ? `${trainer.firstName} ${trainer.lastName}` : '',
        batch.maxStudents.toString(),
        batch.waitlistEnabled ? 'Yes' : 'No',
        batch.status,
        batch.createdAt.toISOString(),
      ]
    })

    await recordAudit('batch.exported', actor.id, actor, context, { count: rows.length })

    return toCsv(columns, csvRows)
  },

  async getBatchById(id: string): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')
    return toDto(batch)
  },

  async createBatch(
    input: CreateBatchInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    await assertCourseUsable(input.courseId)
    await assertTrainersExist([
      ...(input.primaryTrainerId ? [input.primaryTrainerId] : []),
      ...input.assistantTrainerIds,
    ])

    const batchCode = await generateBatchCode()

    const batch = await batchRepository.create({
      ...input,
      shortName: input.shortName ?? null,
      description: input.description ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      enrollmentOpenDate: input.enrollmentOpenDate ?? null,
      enrollmentCloseDate: input.enrollmentCloseDate ?? null,
      minimumStudents: input.minimumStudents ?? null,
      internalNotes: input.internalNotes ?? null,
      batchCode,
      courseId: new Types.ObjectId(input.courseId),
      primaryTrainerId: input.primaryTrainerId ? new Types.ObjectId(input.primaryTrainerId) : null,
      assistantTrainerIds: input.assistantTrainerIds.map((tid) => new Types.ObjectId(tid)),
      location: normalizeLocation(input.location),
      weeklySchedule: normalizeWeeklySchedule(input.weeklySchedule),
      calendarExceptions: normalizeCalendarExceptions(input.calendarExceptions),
      status: 'DRAFT',
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    })

    await recordAudit('batch.created', batch._id, actor, context, {
      batchCode: batch.batchCode,
      name: batch.name,
    })

    return toDto(batch)
  },

  async updateBatch(
    id: string,
    input: UpdateBatchInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')

    /** Phase 10B Part 2 guard — `occupiedSeats` is real now; capacity can never be configured below what's already allocated. */
    if (input.maxStudents !== undefined && input.maxStudents < batch.occupiedSeats) {
      throw ApiError.conflict(
        `Maximum capacity cannot be set below the ${String(batch.occupiedSeats)} seat(s) already occupied`,
      )
    }

    if (input.primaryTrainerId !== undefined || input.assistantTrainerIds !== undefined) {
      await assertTrainersExist([
        ...(input.primaryTrainerId ? [input.primaryTrainerId] : []),
        ...(input.assistantTrainerIds ?? []),
      ])
    }

    const update: Record<string, unknown> = { ...input, updatedBy: actor.id }
    if (input.primaryTrainerId !== undefined) {
      update.primaryTrainerId = new Types.ObjectId(input.primaryTrainerId)
    }
    if (input.assistantTrainerIds !== undefined) {
      update.assistantTrainerIds = input.assistantTrainerIds.map((tid) => new Types.ObjectId(tid))
    }
    if (input.location !== undefined) {
      update.location = normalizeLocation(input.location)
    }
    if (input.weeklySchedule !== undefined) {
      update.weeklySchedule = normalizeWeeklySchedule(input.weeklySchedule)
    }
    if (input.calendarExceptions !== undefined) {
      update.calendarExceptions = normalizeCalendarExceptions(input.calendarExceptions)
    }

    const capacityChanged =
      input.maxStudents !== undefined ||
      input.minimumStudents !== undefined ||
      input.waitlistEnabled !== undefined
    const timetableChanged = input.weeklySchedule !== undefined
    const exceptionsChanged = input.calendarExceptions !== undefined
    const locationDidChange = locationChanged(batch.location, input.location)

    const updated = await batchRepository.updateById(id, update)
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.updated', updated._id, actor, context)
    if (capacityChanged) {
      await recordAudit('batch.capacity_changed', updated._id, actor, context, {
        maxStudents: updated.maxStudents,
        minimumStudents: updated.minimumStudents,
        waitlistEnabled: updated.waitlistEnabled,
      })
    }
    if (timetableChanged) {
      await recordAudit('batch.timetable_changed', updated._id, actor, context, {
        slotCount: updated.weeklySchedule.length,
      })
    }
    if (exceptionsChanged) {
      await recordAudit('batch.calendar_exceptions_changed', updated._id, actor, context, {
        count: updated.calendarExceptions.length,
      })
    }
    if (locationDidChange) {
      await recordAudit('batch.location_changed', updated._id, actor, context)
    }

    return toDto(updated)
  },

  async getReadiness(id: string): Promise<ReadinessResult> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')
    return batchReadinessService.checkReadiness(batch)
  },

  async getConflicts(id: string): Promise<TrainerConflict[]> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')
    return batchConflictService.checkConflicts(batch)
  },

  async assignTrainers(
    id: string,
    input: AssignTrainersInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')

    await assertTrainersExist([
      ...(input.primaryTrainerId ? [input.primaryTrainerId] : []),
      ...input.assistantTrainerIds,
    ])

    const updated = await batchRepository.updateById(id, {
      primaryTrainerId: input.primaryTrainerId ? new Types.ObjectId(input.primaryTrainerId) : null,
      assistantTrainerIds: input.assistantTrainerIds.map((tid) => new Types.ObjectId(tid)),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.trainers_changed', updated._id, actor, context, {
      primaryTrainerId: updated.primaryTrainerId?.toString() ?? null,
      assistantTrainerIds: updated.assistantTrainerIds.map((tid) => tid.toString()),
    })

    return toDto(updated)
  },

  async updateWeeklySchedule(
    id: string,
    weeklySchedule: WeeklyScheduleInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')

    const updated = await batchRepository.updateById(id, {
      weeklySchedule: normalizeWeeklySchedule(weeklySchedule),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.timetable_changed', updated._id, actor, context, {
      slotCount: updated.weeklySchedule.length,
    })

    return toDto(updated)
  },

  async updateCalendarExceptions(
    id: string,
    calendarExceptions: CalendarExceptionsInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')

    const updated = await batchRepository.updateById(id, {
      calendarExceptions: normalizeCalendarExceptions(calendarExceptions),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.calendar_exceptions_changed', updated._id, actor, context, {
      count: updated.calendarExceptions.length,
    })

    return toDto(updated)
  },

  // ---- Lifecycle ------------------------------------------------------------

  async scheduleBatch(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')
    requireTransition(batch.status, 'SCHEDULED')

    const readiness = await batchReadinessService.checkReadiness(batch)
    if (!readiness.ready) {
      throw ApiError.unprocessable('Batch is not ready to be scheduled', readiness.blockers)
    }

    const updated = await batchRepository.updateById(id, {
      status: 'SCHEDULED',
      scheduledAt: new Date(),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.scheduled', updated._id, actor, context)
    return toDto(updated)
  },

  async unscheduleBatch(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')
    requireTransition(batch.status, 'DRAFT')

    const updated = await batchRepository.updateById(id, {
      status: 'DRAFT',
      scheduledAt: null,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.unscheduled', updated._id, actor, context)
    return toDto(updated)
  },

  async activateBatch(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')
    requireTransition(batch.status, 'ACTIVE')

    const updated = await batchRepository.updateById(id, {
      status: 'ACTIVE',
      activatedAt: new Date(),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.activated', updated._id, actor, context)
    return toDto(updated)
  },

  async completeBatch(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')
    requireTransition(batch.status, 'COMPLETED')

    const updated = await batchRepository.updateById(id, {
      status: 'COMPLETED',
      completedAt: new Date(),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.completed', updated._id, actor, context)
    return toDto(updated)
  },

  async cancelBatch(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')
    requireTransition(batch.status, 'CANCELLED')

    const updated = await batchRepository.updateById(id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.cancelled', updated._id, actor, context)
    return toDto(updated)
  },

  async archiveBatch(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')
    requireTransition(batch.status, 'ARCHIVED')

    const updated = await batchRepository.updateById(id, {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.archived', updated._id, actor, context)
    return toDto(updated)
  },

  /** Dual-purpose, mirroring `course-management.service.ts#restoreCourse`: un-deletes if soft-deleted (status untouched); otherwise moves `ARCHIVED` back to `DRAFT` (never straight back to an operational status — a fresh restart, not an undo). */
  async restoreBatch(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const batch = await batchRepository.findByIdIncludingDeleted(id)
    if (!batch) throw ApiError.notFound('Batch not found')

    if (batch.isDeleted) {
      const updated = await batchRepository.updateById(id, {
        isDeleted: false,
        deletedAt: null,
        updatedBy: actor.id,
      })
      if (!updated) throw ApiError.notFound('Batch not found')

      await recordAudit('batch.restored', updated._id, actor, context, { from: 'deleted' })
      return toDto(updated)
    }

    requireTransition(batch.status, 'DRAFT')

    const updated = await batchRepository.updateById(id, {
      status: 'DRAFT',
      archivedAt: null,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Batch not found')

    await recordAudit('batch.restored', updated._id, actor, context, { from: 'archived' })
    return toDto(updated)
  },

  async softDeleteBatch(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const batch = await batchRepository.findById(id)
    if (!batch) throw ApiError.notFound('Batch not found')

    /** Phase 10B guard hook, exactly as Phase 10A's own doc comment anticipated — never destroy enrollment history by deleting the batch it belongs to. */
    if (await enrollmentRepository.existsNonTerminalForBatch(id)) {
      throw ApiError.conflict(
        'This batch has active student enrollments and cannot be deleted — archive it instead',
      )
    }

    await batchRepository.updateById(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: actor.id,
    })

    await recordAudit('batch.soft_deleted', batch._id, actor, context)
  },

  /**
   * Copies configuration only — never `batchCode`/lifecycle status/audit
   * fields, and never dates blindly (task's own explicit rule); the new
   * batch always starts `DRAFT` with the caller-supplied `name`/dates. See
   * `duplicateBatchSchema` — dates are optional, since an admin may want to
   * fill them in later.
   */
  async duplicateBatch(
    id: string,
    input: DuplicateBatchInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminBatchDto> {
    const source = await batchRepository.findById(id)
    if (!source) throw ApiError.notFound('Batch not found')

    const batchCode = await generateBatchCode()

    const duplicate = await batchRepository.create({
      batchCode,
      courseId: source.courseId,
      name: input.name,
      shortName: source.shortName,
      description: source.description,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      enrollmentOpenDate: null,
      enrollmentCloseDate: null,
      timezone: source.timezone,
      deliveryMode: source.deliveryMode,
      status: 'DRAFT',
      primaryTrainerId: source.primaryTrainerId,
      assistantTrainerIds: source.assistantTrainerIds,
      maxStudents: source.maxStudents,
      minimumStudents: source.minimumStudents,
      waitlistEnabled: source.waitlistEnabled,
      location: source.location,
      weeklySchedule: source.weeklySchedule,
      calendarExceptions: [],
      tags: source.tags,
      internalNotes: null,
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    })

    await recordAudit('batch.duplicated', duplicate._id, actor, context, {
      sourceBatchId: source._id.toString(),
      sourceBatchCode: source.batchCode,
    })

    return toDto(duplicate)
  },

  async bulkAction(
    action: BatchBulkAction,
    batchIds: string[],
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<BatchBulkActionResult> {
    const succeeded: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const id of batchIds) {
      try {
        if (action === 'archive') {
          await batchManagementService.archiveBatch(id, actor, context)
        } else if (action === 'cancel') {
          await batchManagementService.cancelBatch(id, actor, context)
        } else {
          await batchManagementService.softDeleteBatch(id, actor, context)
        }
        succeeded.push(id)
      } catch (error) {
        const reason = error instanceof ApiError ? error.message : 'Unexpected error'
        failed.push({ id, reason })
      }
    }

    await recordAudit('batch.bulk_action', actor.id, actor, context, { action, succeeded, failed })

    return { succeeded, failed }
  },

  async getAuditTimeline(
    id: string,
    page: number,
    limit: number,
  ): Promise<{ entries: unknown[]; total: number }> {
    const { entries, total } = await auditLogRepository.findByEntity('batch', id, page, limit)
    return {
      entries: entries.map((entry) => ({
        id: entry._id.toString(),
        action: entry.action,
        actorId: entry.actorId ? entry.actorId.toString() : null,
        actorRole: entry.actorRole,
        createdAt: entry.createdAt.toISOString(),
      })),
      total,
    }
  },
}
