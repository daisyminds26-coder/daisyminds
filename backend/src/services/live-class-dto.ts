import type {
  LiveClassDeliveryMode,
  LiveClassDocument,
  LiveClassProvider,
  LiveClassSource,
  LiveClassStatus,
  AttendanceSessionStatus,
  ILiveClassVenue,
} from '../models/live-class.model'
import type { CourseDocument } from '../models/course.model'
import type { BatchDocument } from '../models/batch.model'
import type { TrainerDocument } from '../models/trainer.model'

export interface LiveClassTrainerSummary {
  id: string
  name: string
}

export interface AdminLiveClassDto {
  id: string
  sessionCode: string
  batchId: string
  batchCode: string
  batchName: string
  courseId: string
  courseCode: string
  courseTitle: string
  title: string
  description: string | null
  scheduledDate: string
  startDateTime: string
  endDateTime: string
  timezone: string
  durationMinutes: number
  deliveryMode: LiveClassDeliveryMode
  provider: LiveClassProvider
  joinUrl: string | null
  hostUrl: string | null
  providerMeetingId: string | null
  venue: ILiveClassVenue | null
  trainers: LiveClassTrainerSummary[]
  primaryTrainer: LiveClassTrainerSummary | null
  status: LiveClassStatus
  source: LiveClassSource
  actualStartedAt: string | null
  actualEndedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  overrideReason: string | null
  attendanceStatus: AttendanceSessionStatus
  attendanceFinalizedAt: string | null
  createdAt: string
  updatedAt: string
}

export function toAdminLiveClassDto(
  session: LiveClassDocument,
  course: Pick<CourseDocument, '_id' | 'courseCode' | 'title'>,
  batch: Pick<BatchDocument, '_id' | 'batchCode' | 'name'>,
  trainerById: Map<string, TrainerDocument>,
): AdminLiveClassDto {
  const toTrainerSummary = (id: string): LiveClassTrainerSummary | null => {
    const trainer = trainerById.get(id)
    if (!trainer) return null
    return { id, name: `${trainer.firstName} ${trainer.lastName}`.trim() }
  }

  return {
    id: session._id.toString(),
    sessionCode: session.sessionCode,
    batchId: batch._id.toString(),
    batchCode: batch.batchCode,
    batchName: batch.name,
    courseId: course._id.toString(),
    courseCode: course.courseCode,
    courseTitle: course.title,
    title: session.title,
    description: session.description,
    scheduledDate: session.scheduledDate.toISOString(),
    startDateTime: session.startDateTime.toISOString(),
    endDateTime: session.endDateTime.toISOString(),
    timezone: session.timezone,
    durationMinutes: session.durationMinutes,
    deliveryMode: session.deliveryMode,
    provider: session.provider,
    joinUrl: session.joinUrl,
    hostUrl: session.hostUrl,
    providerMeetingId: session.providerMeetingId,
    venue: session.venue,
    trainers: session.trainerIds
      .map((id) => toTrainerSummary(id.toString()))
      .filter((trainer): trainer is LiveClassTrainerSummary => trainer !== null),
    primaryTrainer: session.primaryTrainerId
      ? toTrainerSummary(session.primaryTrainerId.toString())
      : null,
    status: session.status,
    source: session.source,
    actualStartedAt: session.actualStartedAt ? session.actualStartedAt.toISOString() : null,
    actualEndedAt: session.actualEndedAt ? session.actualEndedAt.toISOString() : null,
    cancelledAt: session.cancelledAt ? session.cancelledAt.toISOString() : null,
    cancellationReason: session.cancellationReason,
    overrideReason: session.overrideReason,
    attendanceStatus: session.attendanceStatus,
    attendanceFinalizedAt: session.attendanceFinalizedAt
      ? session.attendanceFinalizedAt.toISOString()
      : null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  }
}

/**
 * Only ever contains occurrences already valid to generate — calendar-
 * exception dates and anything outside the batch's own start/end are
 * silently excluded by `generateUpcomingOccurrences` before this DTO is
 * built, matching the "safe by default" rule: generation never proposes a
 * holiday/no-class date. Overriding a specific excluded date (with a
 * required reason) is only ever done via the separate manual single-
 * session creation endpoint, not this bulk preview.
 */
export interface GeneratedOccurrencePreviewDto {
  scheduledDate: string
  dayOfWeek: string
  startTime: string
  endTime: string
  startDateTime: string
  endDateTime: string
  deliveryMode: LiveClassDeliveryMode
  alreadyExists: boolean
}
