import type {
  LiveClassDeliveryMode,
  LiveClassDocument,
  LiveClassStatus,
} from '../models/live-class.model'

export interface StudentLiveClassDto {
  id: string
  sessionCode: string
  courseId: string
  courseTitle: string
  batchId: string
  batchName: string
  title: string
  description: string | null
  scheduledDate: string
  startDateTime: string
  endDateTime: string
  timezone: string
  durationMinutes: number
  deliveryMode: LiveClassDeliveryMode
  status: LiveClassStatus
  trainerName: string | null
  canJoin: boolean
  joinWindowOpensAt: string
}

export function toStudentLiveClassDto(
  session: LiveClassDocument,
  courseTitle: string,
  batchName: string,
  trainerName: string | null,
  canJoin: boolean,
  joinWindowOpensAt: Date,
): StudentLiveClassDto {
  return {
    id: session._id.toString(),
    sessionCode: session.sessionCode,
    courseId: session.courseId.toString(),
    courseTitle,
    batchId: session.batchId.toString(),
    batchName,
    title: session.title,
    description: session.description,
    scheduledDate: session.scheduledDate.toISOString(),
    startDateTime: session.startDateTime.toISOString(),
    endDateTime: session.endDateTime.toISOString(),
    timezone: session.timezone,
    durationMinutes: session.durationMinutes,
    deliveryMode: session.deliveryMode,
    status: session.status,
    trainerName,
    canJoin,
    joinWindowOpensAt: joinWindowOpensAt.toISOString(),
  }
}
