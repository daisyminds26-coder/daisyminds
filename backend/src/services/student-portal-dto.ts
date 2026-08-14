import type { EnrollmentAccessState } from './enrollment-access.service'
import type { EnrollmentDocument, EnrollmentStatus } from '../models/enrollment.model'
import type { CourseDocument, CourseLevel, DeliveryMode } from '../models/course.model'
import type { BatchDocument } from '../models/batch.model'
import type { TrainerDocument } from '../models/trainer.model'
import type { CourseModuleDocument } from '../models/course-module.model'
import type { ContentStatus, LessonDocument, LessonType } from '../models/lesson.model'
import type { LessonResourceDocument, LessonResourceType } from '../models/lesson-resource.model'
import type { ScheduleOccurrence } from '../utils/schedule-occurrence.util'
import type { CourseProgressSummary } from '../utils/course-progress.util'
import type { LessonProgressStatus } from '../models/lesson-progress.model'
import type { IStudent } from '../models/student.model'

/** Minimal, student-safe batch summary — never the full admin `IBatch` (no `internalNotes`, no raw seat-management fields). */
export interface StudentBatchSummaryDto {
  id: string
  batchCode: string
  name: string
  startDate: string | null
  endDate: string | null
  timezone: string
  deliveryMode: string
}

export interface StudentTrainerSummaryDto {
  id: string
  name: string
  profilePhotoUrl: string | null
}

export interface StudentEnrollmentDto {
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
  courseDeliveryMode: DeliveryMode
  certificateEnabled: boolean
  batch: StudentBatchSummaryDto | null
  /** `null` only when the course has no published curriculum at all to measure against. */
  courseProgress: CourseProgressSummary | null
}

export interface StudentDashboardDto {
  continueLearning: StudentEnrollmentDto | null
  courses: StudentEnrollmentDto[]
  upcomingSchedule: (ScheduleOccurrence & { batchName: string; courseTitle: string })[]
}

export interface StudentLessonDto {
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

export interface StudentModuleDto {
  id: string
  title: string
  description: string
  order: number
  estimatedDurationMinutes: number | null
  lessons: StudentLessonDto[]
}

export interface StudentCourseDetailDto {
  id: string
  courseCode: string
  title: string
  shortDescription: string
  description: string
  level: CourseLevel
  language: string
  deliveryMode: DeliveryMode
  certificateEnabled: boolean
  thumbnailUrl: string | null
  accessState: EnrollmentAccessState
  hasAccess: boolean
  enrollmentStatus: EnrollmentStatus
  batch: StudentBatchSummaryDto | null
  trainer: StudentTrainerSummaryDto | null
  modules: StudentModuleDto[]
  courseProgress: CourseProgressSummary
}

export interface StudentResourceDto {
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

export interface StudentProfileDto {
  studentId: string
  firstName: string
  lastName: string
  middleName: string | null
  displayName: string | null
  email: string
  phone: string | null
  alternatePhone: string | null
  address: IStudent['address']
  emergencyContacts: IStudent['emergencyContacts']
  profilePhotoUrl: string | null
  profileCompletionPercentage: number
  profileCompletionStatus: IStudent['profileCompletionStatus']
}

export function toBatchSummaryDto(batch: BatchDocument): StudentBatchSummaryDto {
  return {
    id: batch._id.toString(),
    batchCode: batch.batchCode,
    name: batch.name,
    startDate: batch.startDate ? batch.startDate.toISOString() : null,
    endDate: batch.endDate ? batch.endDate.toISOString() : null,
    timezone: batch.timezone,
    deliveryMode: batch.deliveryMode,
  }
}

export function toTrainerSummaryDto(trainer: TrainerDocument): StudentTrainerSummaryDto {
  return {
    id: trainer._id.toString(),
    name: `${trainer.firstName} ${trainer.lastName}`.trim(),
    profilePhotoUrl: trainer.profilePhotoUrl,
  }
}

export function toEnrollmentDto(
  enrollment: EnrollmentDocument,
  course: CourseDocument,
  batch: BatchDocument | null,
  accessState: EnrollmentAccessState,
  hasAccess: boolean,
  courseProgress: CourseProgressSummary | null,
): StudentEnrollmentDto {
  return {
    id: enrollment._id.toString(),
    enrollmentCode: enrollment.enrollmentCode,
    status: enrollment.status,
    accessState,
    hasAccess,
    enrollmentDate: enrollment.enrollmentDate.toISOString(),
    courseId: course._id.toString(),
    courseTitle: course.title,
    courseCode: course.courseCode,
    courseThumbnailUrl: course.thumbnailUrl,
    courseLevel: course.level,
    courseDeliveryMode: course.deliveryMode,
    certificateEnabled: course.certificateEnabled,
    batch: batch ? toBatchSummaryDto(batch) : null,
    courseProgress,
  }
}

export function toLessonDto(
  lesson: LessonDocument,
  progressStatus: LessonProgressStatus,
  locked: boolean,
  lockReason: string | null,
): StudentLessonDto {
  return {
    id: lesson._id.toString(),
    title: lesson.title,
    shortDescription: lesson.shortDescription,
    order: lesson.order,
    lessonType: lesson.lessonType,
    estimatedDurationMinutes: lesson.estimatedDurationMinutes,
    isPreview: lesson.isPreview,
    isMandatory: lesson.isMandatory,
    contentStatus: lesson.contentStatus,
    progressStatus,
    locked,
    lockReason,
  }
}

export function toModuleDto(
  courseModule: CourseModuleDocument,
  lessons: StudentLessonDto[],
): StudentModuleDto {
  return {
    id: courseModule._id.toString(),
    title: courseModule.title,
    description: courseModule.description,
    order: courseModule.order,
    estimatedDurationMinutes: courseModule.estimatedDurationMinutes,
    lessons,
  }
}

export function toResourceDto(
  resource: LessonResourceDocument,
  lesson: Pick<LessonDocument, '_id' | 'title'>,
  course: Pick<CourseDocument, '_id' | 'title'>,
): StudentResourceDto {
  return {
    id: resource._id.toString(),
    title: resource.title,
    description: resource.description,
    resourceType: resource.resourceType,
    format: resource.format,
    bytes: resource.bytes,
    isDownloadable: resource.isDownloadable,
    lessonId: lesson._id.toString(),
    lessonTitle: lesson.title,
    courseId: course._id.toString(),
    courseTitle: course.title,
  }
}

export function toProfileDto(
  student: IStudent & { _id: unknown },
  email: string,
): StudentProfileDto {
  return {
    studentId: student.studentId,
    firstName: student.firstName,
    lastName: student.lastName,
    middleName: student.middleName,
    displayName: student.displayName,
    email,
    phone: student.phone,
    alternatePhone: student.alternatePhone,
    address: student.address,
    emergencyContacts: student.emergencyContacts,
    profilePhotoUrl: student.profilePhotoUrl,
    profileCompletionPercentage: student.profileCompletionPercentage,
    profileCompletionStatus: student.profileCompletionStatus,
  }
}
