/** Mirrors `backend/src/models/live-class.model.ts` enums exactly. */
export const LIVE_CLASS_STATUSES = ['DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'] as const
export type LiveClassStatus = (typeof LIVE_CLASS_STATUSES)[number]

export const LIVE_CLASS_DELIVERY_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'] as const
export type LiveClassDeliveryMode = (typeof LIVE_CLASS_DELIVERY_MODES)[number]

export const LIVE_CLASS_PROVIDERS = [
  'GOOGLE_MEET',
  'ZOOM',
  'MICROSOFT_TEAMS',
  'MANUAL_LINK',
  'OFFLINE',
  'OTHER',
] as const
export type LiveClassProvider = (typeof LIVE_CLASS_PROVIDERS)[number]

export const LIVE_CLASS_SOURCES = ['MANUAL', 'TIMETABLE_GENERATED'] as const
export type LiveClassSource = (typeof LIVE_CLASS_SOURCES)[number]

export const ATTENDANCE_SESSION_STATUSES = ['OPEN', 'FINALIZED'] as const
export type AttendanceSessionStatus = (typeof ATTENDANCE_SESSION_STATUSES)[number]

export interface LiveClassVenue {
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

export interface LiveClassTrainerSummary {
  id: string
  name: string
}

/** Mirrors `backend/src/services/live-class-dto.ts#AdminLiveClassDto` exactly — used for both the ADMIN and self-scoped TRAINER views (a trainer, like an admin, is an "operator" who receives `hostUrl`; a student never does — see `features/student-live-classes/types`). */
export interface AdminLiveClass {
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
  venue: LiveClassVenue | null
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

export interface ListLiveClassesParams {
  page?: number
  limit?: number
  sort?: `${'startDateTime' | 'createdAt'}:${'asc' | 'desc'}`
  batchId?: string
  courseId?: string
  trainerId?: string
  status?: LiveClassStatus
  provider?: LiveClassProvider
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface CreateLiveClassPayload {
  batchId: string
  title: string
  description?: string
  startDateTime: string
  endDateTime: string
  timezone: string
  deliveryMode: LiveClassDeliveryMode
  provider: LiveClassProvider
  joinUrl?: string
  hostUrl?: string
  venue?: Partial<LiveClassVenue>
  trainerIds?: string[]
  primaryTrainerId?: string
  overrideReason?: string
}

export interface GeneratedOccurrencePreview {
  scheduledDate: string
  dayOfWeek: string
  startTime: string
  endTime: string
  startDateTime: string
  endDateTime: string
  deliveryMode: LiveClassDeliveryMode
  alreadyExists: boolean
}

export interface GenerateLiveClassesResult {
  created: AdminLiveClass[]
  skipped: number
}
