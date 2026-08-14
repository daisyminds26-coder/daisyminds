import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { generateUpcomingOccurrences } from '../utils/schedule-occurrence.util'
import { zonedWallTimeToUtc, minutesBetween } from '../utils/zoned-datetime.util'
import { canTransitionLiveClass, isLiveClassEditable } from '../utils/live-class-lifecycle.util'
import { generateLiveClassSessionCode } from './live-class-id.service'
import { resolveLiveMeetingProvider } from './live-meeting-provider.service'
import {
  toAdminLiveClassDto,
  type AdminLiveClassDto,
  type GeneratedOccurrencePreviewDto,
} from './live-class-dto'
import {
  liveClassRepository,
  type ListLiveClassesFilter,
} from '../repositories/live-class.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import { trainerRepository } from '../repositories/trainer.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import type { LiveClassDocument, LiveClassStatus } from '../models/live-class.model'
import type { CourseDocument } from '../models/course.model'
import type { BatchDocument } from '../models/batch.model'
import type { TrainerDocument } from '../models/trainer.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'
import type {
  CancelLiveClassInput,
  CreateLiveClassInput,
  GenerateCreateInput,
  GeneratePreviewInput,
  ListLiveClassesQuery,
  UpdateLiveClassInput,
} from '../validators/live-class.validator'

const AUDIT_ENTITY_TYPE = 'live_class'

async function recordAudit(
  sessionId: string,
  action: string,
  actor: AuthenticatedUser,
  context: RequestContext,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await auditLogRepository.record({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityType: AUDIT_ENTITY_TYPE,
    entityId: sessionId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

async function requireBatchWithCourse(batchId: string): Promise<{
  batch: BatchDocument
  course: CourseDocument
}> {
  const batch = await batchRepository.findById(batchId)
  if (!batch) throw ApiError.notFound('Batch not found')
  const course = await courseRepository.findById(batch.courseId.toString())
  if (!course) throw ApiError.notFound('Course not found')
  return { batch, course }
}

async function requireTrainers(
  trainerIds: string[],
  primaryTrainerId: string | undefined,
): Promise<Map<string, TrainerDocument>> {
  const allIds = [...new Set([...trainerIds, ...(primaryTrainerId ? [primaryTrainerId] : [])])]
  const trainerById = new Map<string, TrainerDocument>()
  for (const id of allIds) {
    const trainer = await trainerRepository.findById(id)
    if (!trainer) throw ApiError.badRequest(`Trainer ${id} does not exist`)
    trainerById.set(id, trainer)
  }
  if (primaryTrainerId && !trainerIds.includes(primaryTrainerId)) {
    throw ApiError.badRequest('primaryTrainerId must be included in trainerIds')
  }
  return trainerById
}

/**
 * Throws a structured `409` unless an `overrideReason` was supplied — the
 * task's own explicit rule ("Admin may override only if product policy
 * allows... require reason + audit"). Never silently allowed either way.
 */
async function assertNoTrainerConflicts(
  trainerIds: string[],
  startDateTime: Date,
  endDateTime: Date,
  overrideReason: string | undefined,
  excludeSessionId?: string,
): Promise<void> {
  if (trainerIds.length === 0) return
  const overlapping = await liveClassRepository.findOverlappingForTrainers(
    trainerIds,
    startDateTime,
    endDateTime,
    excludeSessionId,
  )
  if (overlapping.length === 0) return
  if (overrideReason) return

  const conflictCodes = overlapping.map((session) => session.sessionCode).join(', ')
  throw ApiError.conflict(
    `One or more trainers already have a session scheduled at this time (${conflictCodes}) — provide overrideReason to schedule anyway`,
  )
}

/** Outside the batch's own `startDate`/`endDate` window requires an explicit override, same rule as trainer conflicts. */
function assertWithinBatchRange(
  batch: BatchDocument,
  scheduledDate: Date,
  overrideReason: string | undefined,
): void {
  if (overrideReason) return
  if (batch.startDate && scheduledDate < batch.startDate) {
    throw ApiError.conflict(
      'This date is before the batch start date — provide overrideReason to proceed',
    )
  }
  if (batch.endDate && scheduledDate > batch.endDate) {
    throw ApiError.conflict(
      'This date is after the batch end date — provide overrideReason to proceed',
    )
  }
}

async function buildDtos(sessions: LiveClassDocument[]): Promise<AdminLiveClassDto[]> {
  const courseIds = [...new Set(sessions.map((session) => session.courseId.toString()))]
  const batchIds = [...new Set(sessions.map((session) => session.batchId.toString()))]
  const trainerIds = [
    ...new Set(sessions.flatMap((session) => session.trainerIds.map((id) => id.toString()))),
  ]

  const [courses, batches, trainers] = await Promise.all([
    courseRepository.findByIds(courseIds),
    batchRepository.findByIds(batchIds),
    Promise.all(trainerIds.map((id) => trainerRepository.findById(id))),
  ])

  const courseById = new Map(courses.map((course) => [course._id.toString(), course]))
  const batchById = new Map(batches.map((batch) => [batch._id.toString(), batch]))
  const trainerById = new Map(
    trainers
      .filter((trainer): trainer is TrainerDocument => trainer !== null)
      .map((trainer) => [trainer._id.toString(), trainer]),
  )

  const dtos: AdminLiveClassDto[] = []
  for (const session of sessions) {
    const course = courseById.get(session.courseId.toString())
    const batch = batchById.get(session.batchId.toString())
    if (!course || !batch) continue
    dtos.push(toAdminLiveClassDto(session, course, batch, trainerById))
  }
  return dtos
}

function toFilter(query: ListLiveClassesQuery): ListLiveClassesFilter {
  return {
    batchId: query.batchId,
    courseId: query.courseId,
    trainerId: query.trainerId,
    status: query.status,
    provider: query.provider,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    search: query.search,
  }
}

export const liveClassService = {
  async listLiveClasses(query: ListLiveClassesQuery): Promise<{
    data: AdminLiveClassDto[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const { rows, total } = await liveClassRepository.list(toFilter(query), {
      page: query.page,
      limit: query.limit,
      sortField: query.sort.field,
      sortDirection: query.sort.direction,
    })
    const data = await buildDtos(rows)
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  },

  async getLiveClass(id: string): Promise<AdminLiveClassDto> {
    const session = await liveClassRepository.findById(id)
    if (!session) throw ApiError.notFound('Session not found')
    const [dto] = await buildDtos([session])
    if (!dto) throw ApiError.notFound('Session not found')
    return dto
  },

  async createLiveClass(
    input: CreateLiveClassInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminLiveClassDto> {
    const { batch, course } = await requireBatchWithCourse(input.batchId)
    await requireTrainers(input.trainerIds, input.primaryTrainerId)

    assertWithinBatchRange(batch, input.startDateTime, input.overrideReason)
    await assertNoTrainerConflicts(
      input.trainerIds,
      input.startDateTime,
      input.endDateTime,
      input.overrideReason,
    )

    let joinUrl: string | null = null
    let hostUrl: string | null = null
    let providerMeetingId: string | null = null
    if (input.provider !== 'OFFLINE') {
      if (!input.joinUrl)
        throw ApiError.badRequest('A meeting join URL is required for this delivery mode')
      const provider = resolveLiveMeetingProvider(input.provider)
      const meeting = await provider.createMeeting({
        joinUrl: input.joinUrl,
        hostUrl: input.hostUrl,
      })
      joinUrl = meeting.joinUrl
      hostUrl = meeting.hostUrl
      providerMeetingId = meeting.providerMeetingId
    }
    if ((input.deliveryMode === 'OFFLINE' || input.deliveryMode === 'HYBRID') && !input.venue) {
      throw ApiError.badRequest('A venue is required for offline/hybrid sessions')
    }

    const sessionCode = await generateLiveClassSessionCode()
    const scheduledDate = new Date(
      Date.UTC(
        input.startDateTime.getUTCFullYear(),
        input.startDateTime.getUTCMonth(),
        input.startDateTime.getUTCDate(),
      ),
    )

    const session = await liveClassRepository.create({
      sessionCode,
      batchId: batch._id,
      courseId: course._id,
      title: input.title,
      description: input.description ?? null,
      scheduledDate,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      timezone: input.timezone,
      durationMinutes: Math.round(
        (input.endDateTime.getTime() - input.startDateTime.getTime()) / 60_000,
      ),
      deliveryMode: input.deliveryMode,
      provider: input.provider,
      joinUrl,
      hostUrl,
      providerMeetingId,
      venue: input.venue
        ? {
            venueName: input.venue.venueName ?? null,
            addressLine1: input.venue.addressLine1 ?? null,
            addressLine2: input.venue.addressLine2 ?? null,
            city: input.venue.city ?? null,
            state: input.venue.state ?? null,
            postalCode: input.venue.postalCode ?? null,
            country: input.venue.country ?? null,
            room: input.venue.room ?? null,
            mapUrl: input.venue.mapUrl ?? null,
          }
        : null,
      trainerIds: input.trainerIds.map((tid) => new Types.ObjectId(tid)),
      primaryTrainerId: input.primaryTrainerId ? new Types.ObjectId(input.primaryTrainerId) : null,
      status: 'DRAFT',
      source: 'MANUAL',
      overrideReason: input.overrideReason ?? null,
      createdBy: new Types.ObjectId(actor.id),
    })

    await recordAudit(session._id.toString(), 'live_class.created', actor, context, {
      sessionCode,
      batchId: input.batchId,
    })

    const [dto] = await buildDtos([session])
    if (!dto) throw ApiError.notFound('Session not found')
    return dto
  },

  async updateLiveClass(
    id: string,
    input: UpdateLiveClassInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminLiveClassDto> {
    const session = await liveClassRepository.findById(id)
    if (!session) throw ApiError.notFound('Session not found')
    if (!isLiveClassEditable(session.status)) {
      throw ApiError.conflict('Only DRAFT or SCHEDULED sessions can be edited')
    }

    const startDateTime = input.startDateTime ?? session.startDateTime
    const endDateTime = input.endDateTime ?? session.endDateTime
    if (startDateTime >= endDateTime)
      throw ApiError.badRequest('Start time must be before end time')

    const trainerIds = input.trainerIds ?? session.trainerIds.map((tid) => tid.toString())
    if (input.trainerIds || input.startDateTime || input.endDateTime) {
      await requireTrainers(
        trainerIds,
        input.primaryTrainerId ?? session.primaryTrainerId?.toString(),
      )
      await assertNoTrainerConflicts(
        trainerIds,
        startDateTime,
        endDateTime,
        input.overrideReason,
        id,
      )
    }

    const update: Record<string, unknown> = { updatedBy: actor.id }
    if (input.title !== undefined) update.title = input.title
    if (input.description !== undefined) update.description = input.description
    if (input.startDateTime !== undefined) {
      update.startDateTime = input.startDateTime
      update.scheduledDate = new Date(
        Date.UTC(
          input.startDateTime.getUTCFullYear(),
          input.startDateTime.getUTCMonth(),
          input.startDateTime.getUTCDate(),
        ),
      )
    }
    if (input.endDateTime !== undefined) update.endDateTime = input.endDateTime
    if (input.startDateTime !== undefined || input.endDateTime !== undefined) {
      update.durationMinutes = Math.round(
        (endDateTime.getTime() - startDateTime.getTime()) / 60_000,
      )
    }
    if (input.timezone !== undefined) update.timezone = input.timezone
    if (input.deliveryMode !== undefined) update.deliveryMode = input.deliveryMode
    if (input.provider !== undefined) update.provider = input.provider
    if (input.joinUrl !== undefined) update.joinUrl = input.joinUrl
    if (input.hostUrl !== undefined) update.hostUrl = input.hostUrl
    if (input.venue !== undefined) update.venue = input.venue
    if (input.trainerIds !== undefined) update.trainerIds = input.trainerIds
    if (input.primaryTrainerId !== undefined) update.primaryTrainerId = input.primaryTrainerId
    if (input.overrideReason !== undefined) update.overrideReason = input.overrideReason

    const updated = await liveClassRepository.updateById(id, update)
    if (!updated) throw ApiError.notFound('Session not found')

    await recordAudit(id, 'live_class.updated', actor, context, { fields: Object.keys(update) })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Session not found')
    return dto
  },

  async transition(
    id: string,
    to: LiveClassStatus,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminLiveClassDto> {
    const session = await liveClassRepository.findById(id)
    if (!session) throw ApiError.notFound('Session not found')
    if (!canTransitionLiveClass(session.status, to)) {
      throw ApiError.conflict(`Cannot move a session from ${session.status} to ${to}`)
    }

    const update: Record<string, unknown> = { status: to, updatedBy: actor.id }
    const now = new Date()
    if (to === 'LIVE') update.actualStartedAt = now
    if (to === 'COMPLETED') update.actualEndedAt = now

    const updated = await liveClassRepository.updateById(id, update)
    if (!updated) throw ApiError.notFound('Session not found')

    const actionByStatus: Partial<Record<LiveClassStatus, string>> = {
      SCHEDULED: 'live_class.scheduled',
      LIVE: 'live_class.started',
      COMPLETED: 'live_class.completed',
    }
    await recordAudit(id, actionByStatus[to] ?? 'live_class.updated', actor, context, {
      from: session.status,
      to,
    })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Session not found')
    return dto
  },

  async cancelLiveClass(
    id: string,
    input: CancelLiveClassInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminLiveClassDto> {
    const session = await liveClassRepository.findById(id)
    if (!session) throw ApiError.notFound('Session not found')
    if (!canTransitionLiveClass(session.status, 'CANCELLED')) {
      throw ApiError.conflict(`Cannot cancel a session in ${session.status} status`)
    }

    const updated = await liveClassRepository.updateById(id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: input.reason,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Session not found')

    await recordAudit(id, 'live_class.cancelled', actor, context, { reason: input.reason })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Session not found')
    return dto
  },

  async previewGeneration(input: GeneratePreviewInput): Promise<GeneratedOccurrencePreviewDto[]> {
    const { batch } = await requireBatchWithCourse(input.batchId)

    const daysAhead = Math.max(
      0,
      Math.round((input.endDate.getTime() - input.startDate.getTime()) / 86_400_000),
    )
    const occurrences = generateUpcomingOccurrences({
      weeklySchedule: batch.weeklySchedule,
      calendarExceptions: batch.calendarExceptions,
      startDate: batch.startDate,
      endDate: batch.endDate,
      deliveryMode: batch.deliveryMode,
      timezone: batch.timezone,
      from: input.startDate,
      daysAhead,
      maxOccurrences: 366,
    })

    const previews: GeneratedOccurrencePreviewDto[] = []
    for (const occurrence of occurrences) {
      const startDateTime = zonedWallTimeToUtc(
        occurrence.date,
        occurrence.startTime,
        batch.timezone,
      )
      const endDateTime = zonedWallTimeToUtc(occurrence.date, occurrence.endTime, batch.timezone)
      const scheduledDate = new Date(
        Date.UTC(
          startDateTime.getUTCFullYear(),
          startDateTime.getUTCMonth(),
          startDateTime.getUTCDate(),
        ),
      )
      const alreadyExists = await liveClassRepository.existsGeneratedOccurrence(
        input.batchId,
        scheduledDate,
        startDateTime,
      )
      previews.push({
        scheduledDate: occurrence.date,
        dayOfWeek: occurrence.dayOfWeek,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        deliveryMode: occurrence.deliveryMode,
        alreadyExists,
      })
    }
    return previews
  },

  async generateFromTimetable(
    input: GenerateCreateInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<{ created: AdminLiveClassDto[]; skipped: number }> {
    const { batch, course } = await requireBatchWithCourse(input.batchId)

    const daysAhead = Math.max(
      0,
      Math.round((input.endDate.getTime() - input.startDate.getTime()) / 86_400_000),
    )
    const occurrences = generateUpcomingOccurrences({
      weeklySchedule: batch.weeklySchedule,
      calendarExceptions: batch.calendarExceptions,
      startDate: batch.startDate,
      endDate: batch.endDate,
      deliveryMode: batch.deliveryMode,
      timezone: batch.timezone,
      from: input.startDate,
      daysAhead,
      maxOccurrences: 366,
    })

    const selectedDates = input.scheduledDates ? new Set(input.scheduledDates) : null

    const created: LiveClassDocument[] = []
    let skipped = 0

    for (const occurrence of occurrences) {
      if (selectedDates && !selectedDates.has(occurrence.date)) continue

      const startDateTime = zonedWallTimeToUtc(
        occurrence.date,
        occurrence.startTime,
        batch.timezone,
      )
      const endDateTime = zonedWallTimeToUtc(occurrence.date, occurrence.endTime, batch.timezone)
      const scheduledDate = new Date(
        Date.UTC(
          startDateTime.getUTCFullYear(),
          startDateTime.getUTCMonth(),
          startDateTime.getUTCDate(),
        ),
      )

      const alreadyExists = await liveClassRepository.existsGeneratedOccurrence(
        input.batchId,
        scheduledDate,
        startDateTime,
      )
      if (alreadyExists) {
        skipped += 1
        continue
      }

      const sessionCode = await generateLiveClassSessionCode()
      const session = await liveClassRepository.create({
        sessionCode,
        batchId: batch._id,
        courseId: course._id,
        title: `${course.title} — Live Class`,
        description: null,
        scheduledDate,
        startDateTime,
        endDateTime,
        timezone: batch.timezone,
        durationMinutes: minutesBetween(occurrence.startTime, occurrence.endTime),
        deliveryMode: occurrence.deliveryMode,
        provider: 'MANUAL_LINK',
        joinUrl: null,
        hostUrl: null,
        providerMeetingId: null,
        venue: null,
        trainerIds: batch.primaryTrainerId ? [batch.primaryTrainerId] : [],
        primaryTrainerId: batch.primaryTrainerId,
        status: 'DRAFT',
        source: 'TIMETABLE_GENERATED',
        createdBy: new Types.ObjectId(actor.id),
      })
      created.push(session)
    }

    if (created.length > 0) {
      await recordAudit(input.batchId, 'live_class.generated_from_timetable', actor, context, {
        batchId: input.batchId,
        createdCount: created.length,
        skippedCount: skipped,
      })
    }

    return { created: await buildDtos(created), skipped }
  },
}
