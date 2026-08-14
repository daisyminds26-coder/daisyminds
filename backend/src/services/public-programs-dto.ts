import type { CourseDocument } from '../models/course.model'
import type { CourseModuleDocument } from '../models/course-module.model'
import type { LessonDocument } from '../models/lesson.model'
import type { BatchDocument } from '../models/batch.model'

/**
 * The public surface of a Course — deliberately narrower than
 * `course-management.service.ts`'s `toDto`/`toListItemDto` (which are
 * admin-only and include `internalNotes`, `eligibleTrainerIds`, raw
 * Cloudinary `*PublicId`s, and soft-delete/audit fields). Never returns the
 * admin DTO with fields stripped after the fact — this mapper reads the
 * document directly, so a future admin-only field added to `ICourse` is
 * absent here by default, not by omission.
 */
export interface PublicProgramListItemDto {
  id: string
  courseCode: string
  slug: string
  title: string
  shortDescription: string
  thumbnailUrl: string | null
  category: string
  level: string
  deliveryMode: string
  duration: string | null
  skills: string[]
  certificateAvailable: boolean
  featured: boolean
  featuredOrder: number | null
}

export interface PublicLessonDto {
  id: string
  title: string
  lessonType: string
  estimatedDurationMinutes: number | null
}

export interface PublicModuleDto {
  id: string
  title: string
  description: string
  lessons: PublicLessonDto[]
}

export type PublicBatchAvailability = 'AVAILABLE' | 'LIMITED' | 'FULL'

export interface PublicUpcomingBatchDto {
  id: string
  batchCode: string
  name: string
  startDate: string | null
  endDate: string | null
  deliveryMode: string
  timezone: string
  weeklyScheduleSummary: string[]
  availability: PublicBatchAvailability
}

export interface PublicProgramDetailDto extends PublicProgramListItemDto {
  description: string
  bannerUrl: string | null
  language: string
  durationValue: number | null
  durationUnit: string | null
  learningOutcomes: string[]
  seo: { title: string; description: string }
  publishedAt: string | null
  curriculum: PublicModuleDto[]
  upcomingBatches: PublicUpcomingBatchDto[]
}

/** `"12 Weeks"` / `"6 Hours"` — null when either half is unset, never a half-formed string. */
function formatDuration(value: number | null, unit: string | null): string | null {
  if (value === null || unit === null) return null
  const label = unit.charAt(0) + unit.slice(1).toLowerCase()
  return `${String(value)} ${label}`
}

export function toPublicProgramListItemDto(course: CourseDocument): PublicProgramListItemDto {
  return {
    id: course._id.toString(),
    courseCode: course.courseCode,
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription,
    thumbnailUrl: course.thumbnailUrl,
    category: course.category,
    level: course.level,
    deliveryMode: course.deliveryMode,
    duration: formatDuration(course.durationValue, course.durationUnit),
    skills: course.skills,
    certificateAvailable: course.certificateEnabled,
    featured: course.isFeatured,
    featuredOrder: course.featuredOrder,
  }
}

export function toPublicLessonDto(lesson: LessonDocument): PublicLessonDto {
  return {
    id: lesson._id.toString(),
    title: lesson.title,
    lessonType: lesson.lessonType,
    estimatedDurationMinutes: lesson.estimatedDurationMinutes,
  }
}

export function toPublicModuleDto(
  courseModule: CourseModuleDocument,
  lessons: LessonDocument[],
): PublicModuleDto {
  return {
    id: courseModule._id.toString(),
    title: courseModule.title,
    description: courseModule.description,
    lessons: lessons.map(toPublicLessonDto),
  }
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
}

/** `"Mon 6:00 PM - 8:00 PM"` per slot — schedule-shape only, never `locationOverride`/internal notes. */
function summarizeWeeklySchedule(batch: BatchDocument): string[] {
  return batch.weeklySchedule.map((slot) => {
    const day = DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek
    return `${day} ${slot.startTime}-${slot.endTime}`
  })
}

/**
 * Coarse, never-fake availability derived from real `maxStudents`/
 * `occupiedSeats` already on the batch document in hand — deliberately not
 * a call to `EnrollllmentCapacityService.getCapacitySnapshot` (which does an
 * extra waitlist-count query per batch); the public surface never exposes
 * waitlist data anyway, so that query would be pure N+1 cost for nothing.
 */
function deriveAvailability(batch: BatchDocument): PublicBatchAvailability {
  const available = Math.max(0, batch.maxStudents - batch.occupiedSeats)
  if (available <= 0) return 'FULL'
  if (available / batch.maxStudents <= 0.2) return 'LIMITED'
  return 'AVAILABLE'
}

export function toPublicUpcomingBatchDto(batch: BatchDocument): PublicUpcomingBatchDto {
  return {
    id: batch._id.toString(),
    batchCode: batch.batchCode,
    name: batch.name,
    startDate: batch.startDate ? batch.startDate.toISOString() : null,
    endDate: batch.endDate ? batch.endDate.toISOString() : null,
    deliveryMode: batch.deliveryMode,
    timezone: batch.timezone,
    weeklyScheduleSummary: summarizeWeeklySchedule(batch),
    availability: deriveAvailability(batch),
  }
}

export function toPublicProgramDetailDto(
  course: CourseDocument,
  curriculum: PublicModuleDto[],
  upcomingBatches: PublicUpcomingBatchDto[],
): PublicProgramDetailDto {
  return {
    ...toPublicProgramListItemDto(course),
    description: course.description,
    bannerUrl: course.bannerUrl,
    language: course.language,
    durationValue: course.durationValue,
    durationUnit: course.durationUnit,
    learningOutcomes: course.learningOutcomes,
    seo: {
      // The website's <Seo> component appends " | Daisy Minds" itself — this
      // fallback must stay bare, matching what an explicit metaTitle would be.
      title: course.metaTitle ?? course.title,
      description: course.metaDescription ?? course.shortDescription,
    },
    publishedAt: course.publishedAt ? course.publishedAt.toISOString() : null,
    curriculum,
    upcomingBatches,
  }
}
