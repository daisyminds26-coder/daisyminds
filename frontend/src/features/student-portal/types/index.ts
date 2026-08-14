/** Mirrors `backend/src/services/enrollment-access.service.ts#ENROLLMENT_ACCESS_STATES` exactly. */
export type EnrollmentAccessState =
  'ACTIVE' | 'LIFETIME' | 'NOT_YET_ACTIVE' | 'SUSPENDED' | 'ENDED' | 'NONE'

/** Mirrors `backend/src/models/enrollment.model.ts#ENROLLMENT_STATUSES`. */
export type EnrollmentStatus =
  | 'PENDING'
  | 'WAITLISTED'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DROPPED'

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS'
export type CourseDeliveryMode = 'ONLINE' | 'OFFLINE' | 'HYBRID' | 'SELF_PACED'
export type BatchDeliveryMode = 'ONLINE' | 'OFFLINE' | 'HYBRID'
export type LessonType =
  'VIDEO' | 'TEXT' | 'DOCUMENT' | 'LIVE_CLASS' | 'QUIZ' | 'ASSIGNMENT' | 'EXTERNAL_LINK'
export type ContentStatus =
  'EMPTY' | 'INCOMPLETE' | 'READY' | 'PROCESSING' | 'ERROR' | 'NOT_CONFIGURED'
export type LessonResourceType = 'PDF' | 'DOCUMENT' | 'SLIDES' | 'ARCHIVE' | 'IMAGE' | 'OTHER'
export type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type MediaAssetStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'

/** Mirrors `backend/src/utils/course-progress.util.ts#CourseProgressSummary` exactly — always backend-computed, never re-derived client-side. */
export interface CourseProgressSummary {
  totalLessons: number
  completedLessons: number
  mandatoryLessons: number
  completedMandatoryLessons: number
  percentage: number
  isComplete: boolean
  lastAccessedLessonId: string | null
  lastAccessedAt: string | null
  firstLessonId: string | null
}

export interface StudentBatchSummary {
  id: string
  batchCode: string
  name: string
  startDate: string | null
  endDate: string | null
  timezone: string
  deliveryMode: string
}

export interface StudentTrainerSummary {
  id: string
  name: string
  profilePhotoUrl: string | null
}

export interface StudentEnrollment {
  id: string
  enrollmentCode: string
  status: EnrollmentStatus
  accessState: EnrollmentAccessState
  hasAccess: boolean
  enrollmentDate: string
  courseId: string
  courseTitle: string
  courseCode: string
  courseThumbnailUrl: string | null
  courseLevel: CourseLevel
  courseDeliveryMode: CourseDeliveryMode
  certificateEnabled: boolean
  batch: StudentBatchSummary | null
  courseProgress: CourseProgressSummary | null
}

export interface ScheduleOccurrence {
  date: string
  dayOfWeek: string
  startTime: string
  endTime: string
  sessionLabel: string | null
  deliveryMode: BatchDeliveryMode
  batchName: string
  courseTitle: string
}

export interface StudentDashboard {
  continueLearning: StudentEnrollment | null
  courses: StudentEnrollment[]
  upcomingSchedule: ScheduleOccurrence[]
}

export interface StudentLesson {
  id: string
  title: string
  shortDescription: string
  order: number
  lessonType: LessonType
  estimatedDurationMinutes: number | null
  isPreview: boolean
  isMandatory: boolean
  contentStatus: ContentStatus
  progressStatus: LessonProgressStatus
  locked: boolean
  lockReason: string | null
}

export interface StudentModule {
  id: string
  title: string
  description: string
  order: number
  estimatedDurationMinutes: number | null
  lessons: StudentLesson[]
}

export interface StudentCourseDetail {
  id: string
  courseCode: string
  title: string
  shortDescription: string
  description: string
  level: CourseLevel
  language: string
  deliveryMode: CourseDeliveryMode
  certificateEnabled: boolean
  thumbnailUrl: string | null
  accessState: EnrollmentAccessState
  hasAccess: boolean
  enrollmentStatus: EnrollmentStatus
  batch: StudentBatchSummary | null
  trainer: StudentTrainerSummary | null
  modules: StudentModule[]
  courseProgress: CourseProgressSummary
}

export interface StudentResource {
  id: string
  title: string
  description: string | null
  resourceType: LessonResourceType
  format: string
  bytes: number
  isDownloadable: boolean
  lessonId: string
  lessonTitle: string
  courseId: string
  courseTitle: string
}

export interface StudentAddress {
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
}

export interface StudentEmergencyContact {
  name: string
  phone: string
  relationship: string
  alternatePhone: string | null
  email: string | null
}

export interface StudentProfile {
  studentId: string
  firstName: string
  lastName: string
  middleName: string | null
  displayName: string | null
  email: string
  phone: string | null
  alternatePhone: string | null
  address: StudentAddress | null
  emergencyContacts: StudentEmergencyContact[]
  profilePhotoUrl: string | null
  profileCompletionPercentage: number
  profileCompletionStatus: 'INCOMPLETE' | 'PARTIAL' | 'COMPLETE'
}

export interface UpdateStudentProfilePayload {
  phone?: string
  alternatePhone?: string
  address?: Omit<StudentAddress, 'line2'> & { line2?: string }
  emergencyContacts?: (Omit<StudentEmergencyContact, 'alternatePhone' | 'email'> & {
    alternatePhone?: string
    email?: string
  })[]
}
