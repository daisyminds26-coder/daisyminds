export const BATCH_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
] as const
export type BatchStatus = (typeof BATCH_STATUSES)[number]

export const BATCH_DELIVERY_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'] as const
export type BatchDeliveryMode = (typeof BATCH_DELIVERY_MODES)[number]

export const MEETING_PROVIDERS = ['GOOGLE_MEET', 'ZOOM', 'TEAMS', 'OTHER'] as const
export type MeetingProvider = (typeof MEETING_PROVIDERS)[number]

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

export const CALENDAR_EXCEPTION_TYPES = [
  'HOLIDAY',
  'NO_CLASS',
  'INSTITUTE_CLOSED',
  'TRAINER_UNAVAILABLE',
  'OTHER',
] as const
export type CalendarExceptionType = (typeof CALENDAR_EXCEPTION_TYPES)[number]

export const BATCH_BULK_ACTIONS = ['archive', 'cancel', 'delete'] as const
export type BatchBulkAction = (typeof BATCH_BULK_ACTIONS)[number]

export interface WeeklyScheduleSlot {
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  sessionLabel: string | null
  locationOverride: string | null
  deliveryModeOverride: BatchDeliveryMode | null
}

export interface CalendarException {
  date: string
  type: CalendarExceptionType
  title: string
  note: string | null
}

export interface BatchLocation {
  meetingProvider: MeetingProvider | null
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

export interface AdminBatchListItem {
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
  /** Server-managed derived state (Phase 10B) — never client-editable; only `maxStudents` is configured. */
  occupiedSeats: number
  availableSeats: number
  waitlistEnabled: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface BatchCapacitySnapshot {
  maxStudents: number
  occupiedSeats: number
  availableSeats: number
  waitlistCount: number
}

export interface WaitlistEntry {
  id: string
  enrollmentCode: string
  studentId: string
  studentCode: string | null
  studentName: string
  waitlistedAt: string | null
  waitlistPosition: number | null
}

export interface AdminBatch extends AdminBatchListItem {
  description: string
  enrollmentOpenDate: string | null
  enrollmentCloseDate: string | null
  assistantTrainerIds: string[]
  minimumStudents: number | null
  location: BatchLocation
  weeklySchedule: WeeklyScheduleSlot[]
  calendarExceptions: CalendarException[]
  tags: string[]
  internalNotes: string | null
  scheduledAt: string | null
  activatedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  archivedAt: string | null
}

export interface ReadinessBlocker {
  field: string
  code: string
  message: string
}

export interface ReadinessResult {
  ready: boolean
  blockers: ReadinessBlocker[]
}

export interface TrainerConflict {
  type: 'AVAILABILITY' | 'CROSS_BATCH'
  trainerId: string
  message: string
  conflictingBatchId?: string
  conflictingBatchCode?: string
}

export interface BatchBulkActionResult {
  succeeded: string[]
  failed: { id: string; reason: string }[]
}

export interface AuditLogEntry {
  id: string
  action: string
  actorId: string | null
  actorRole: string | null
  createdAt: string
}

export type SortField =
  | 'batchCode'
  | 'name'
  | 'startDate'
  | 'endDate'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
  | 'maxStudents'
export type SortDirection = 'asc' | 'desc'
export type Temporal = 'upcoming' | 'current' | 'past'

export interface ListBatchesParams {
  page?: number
  limit?: number
  sort?: `${SortField}:${SortDirection}`
  status?: BatchStatus
  courseId?: string
  primaryTrainerId?: string
  deliveryMode?: BatchDeliveryMode
  timezone?: string
  startDateFrom?: string
  startDateTo?: string
  endDateFrom?: string
  endDateTo?: string
  temporal?: Temporal
  minCapacity?: number
  maxCapacity?: number
  waitlistEnabled?: boolean
  search?: string
  includeDeleted?: boolean
}
