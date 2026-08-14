import { ApiError } from '../utils/api-error'
import { computeCourseProgress, type CourseProgressSummary } from '../utils/course-progress.util'
import { generateSignedDeliveryUrl } from './media-delivery.service'
import { resolveStudentForUser } from './student-identity.util'
import {
  assertStudentLessonAccess,
  resolveStudentLessonAccess,
} from './student-lesson-access.service'
import {
  buildLessonDetailDto,
  toLessonProgressDto,
  type StudentLessonDetailDto,
  type StudentLessonNavigationDto,
  type StudentLessonProgressDto,
  type StudentLessonResourceSummaryDto,
} from './student-learning-dto'
import { courseRepository } from '../repositories/course.repository'
import { curriculumRepository } from '../repositories/curriculum.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { lessonProgressRepository } from '../repositories/lesson-progress.repository'
import { lessonResourceRepository } from '../repositories/lesson-resource.repository'
import type { UpdateLessonProgressInput } from '../validators/student-learning.validator'

const MEDIA_DELIVERY_EXPIRY_SECONDS = 300
/** Watched-90%-of-duration auto-completes a video lesson (task's own documented rule) — never "every second," never anti-cheat/seek-prevention. */
const VIDEO_COMPLETION_THRESHOLD_RATIO = 0.9

interface OrderedLesson {
  id: string
  moduleId: string
  moduleTitle: string
  moduleOrder: number
  order: number
  isMandatory: boolean
}

/** Published lessons under a published module, in curriculum order — the one shared source for navigation (prev/next) and course-progress calculation, never re-derived per caller. */
async function getPublishedOrderedLessons(courseId: string): Promise<OrderedLesson[]> {
  const [modules, lessons] = await Promise.all([
    curriculumRepository.findModulesByCourse(courseId),
    curriculumRepository.findLessonsByCourse(courseId),
  ])

  const publishedModuleById = new Map(
    modules
      .filter((courseModule) => courseModule.status === 'PUBLISHED')
      .map((courseModule) => [courseModule._id.toString(), courseModule]),
  )

  const result: OrderedLesson[] = []
  for (const lesson of lessons) {
    if (lesson.status !== 'PUBLISHED') continue
    const moduleId = lesson.courseModuleId.toString()
    const courseModule = publishedModuleById.get(moduleId)
    if (!courseModule) continue
    result.push({
      id: lesson._id.toString(),
      moduleId,
      moduleTitle: courseModule.title,
      moduleOrder: courseModule.order,
      order: lesson.order,
      isMandatory: lesson.isMandatory,
    })
  }

  return result.sort((a, b) =>
    a.moduleOrder === b.moduleOrder ? a.order - b.order : a.moduleOrder - b.moduleOrder,
  )
}

/**
 * Exported standalone (not just a method on `studentLearningService`) so
 * `student-portal.service.ts` can compute the same progress bars for the
 * Dashboard/My Courses cards without duplicating the algorithm — one
 * course's worth of work (2 queries), called in a bounded `Promise.all`
 * across a student's typically-small enrollment list.
 */
export async function computeCourseProgressForStudent(
  studentId: string,
  courseId: string,
): Promise<CourseProgressSummary> {
  const [orderedLessons, progressRows] = await Promise.all([
    getPublishedOrderedLessons(courseId),
    lessonProgressRepository.findAllByStudentAndCourse(studentId, courseId),
  ])

  return computeCourseProgress(
    orderedLessons.map((lesson) => ({
      id: lesson.id,
      moduleOrder: lesson.moduleOrder,
      order: lesson.order,
      isMandatory: lesson.isMandatory,
    })),
    progressRows.map((row) => ({
      lessonId: row.lessonId.toString(),
      status: row.status,
      lastAccessedAt: row.lastAccessedAt,
    })),
  )
}

async function buildNavigation(
  courseId: string,
  lessonId: string,
): Promise<StudentLessonNavigationDto> {
  const orderedLessons = await getPublishedOrderedLessons(courseId)
  const index = orderedLessons.findIndex((lesson) => lesson.id === lessonId)
  return {
    previousLessonId: index > 0 ? (orderedLessons[index - 1]?.id ?? null) : null,
    nextLessonId:
      index >= 0 && index < orderedLessons.length - 1
        ? (orderedLessons[index + 1]?.id ?? null)
        : null,
  }
}

export const studentLearningService = {
  async getCourseProgress(userId: string, courseId: string): Promise<CourseProgressSummary> {
    const student = await resolveStudentForUser(userId)
    const course = await courseRepository.findById(courseId)
    if (!course) throw ApiError.notFound('Course not found')
    const enrollment = await enrollmentRepository.findLatestByStudentAndCourse(
      student._id.toString(),
      courseId,
    )
    if (!enrollment) throw ApiError.notFound('Course not found')
    return computeCourseProgressForStudent(student._id.toString(), courseId)
  },

  async getLessonDetail(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<StudentLessonDetailDto> {
    const context = await resolveStudentLessonAccess({ userId, courseId, lessonId })
    const canReveal = context.hasAccess && !context.locked

    const [navigation, existingProgress] = await Promise.all([
      buildNavigation(courseId, lessonId),
      lessonProgressRepository.findByStudentAndLesson(context.student._id.toString(), lessonId),
    ])

    // Opening an accessible, unlocked lesson is what "resumes learning" tracks — bumps lastAccessedAt (and startedAt on first-ever open), never downgrades an already-COMPLETED status.
    let progress = existingProgress
    if (canReveal) {
      const now = new Date()
      progress = await lessonProgressRepository.upsertProgress({
        studentId: context.student._id.toString(),
        courseId,
        lessonId,
        enrollmentId: context.enrollment._id.toString(),
        status: existingProgress?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        startedAt: now,
        lastAccessedAt: now,
      })
    }

    let resources: StudentLessonResourceSummaryDto[] = []
    if (canReveal) {
      const resourceDocs = await lessonResourceRepository.findByLesson(lessonId)
      resources = resourceDocs.map((resource) => ({
        id: resource._id.toString(),
        title: resource.title,
        resourceType: resource.resourceType,
        format: resource.format,
        bytes: resource.bytes,
        isDownloadable: resource.isDownloadable,
      }))
    }

    return buildLessonDetailDto({
      lesson: context.lesson,
      courseModule: context.courseModule,
      accessState: context.accessState,
      hasAccess: context.hasAccess,
      locked: context.locked,
      lockReason: context.lockReason,
      progress,
      navigation,
      resources,
    })
  },

  async getLessonMediaUrl(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const context = await assertStudentLessonAccess({ userId, courseId, lessonId })
    const { lesson } = context

    if (lesson.lessonType === 'VIDEO') {
      if (lesson.videoAsset?.status !== 'READY') {
        throw ApiError.unprocessable('This video is not ready yet')
      }
      const url = generateSignedDeliveryUrl(lesson.videoAsset.publicId, {
        resourceType: 'video',
        format: lesson.videoAsset.format,
        expirySeconds: MEDIA_DELIVERY_EXPIRY_SECONDS,
      })
      return { url, expiresInSeconds: MEDIA_DELIVERY_EXPIRY_SECONDS }
    }

    if (lesson.lessonType === 'DOCUMENT') {
      if (!lesson.documentAsset) throw ApiError.unprocessable('This lesson has no document')
      const url = generateSignedDeliveryUrl(lesson.documentAsset.publicId, {
        resourceType: 'raw',
        format: lesson.documentAsset.format,
        expirySeconds: MEDIA_DELIVERY_EXPIRY_SECONDS,
      })
      return { url, expiresInSeconds: MEDIA_DELIVERY_EXPIRY_SECONDS }
    }

    throw ApiError.badRequest('This lesson type has no media to deliver')
  },

  async updateLessonProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    input: UpdateLessonProgressInput,
  ): Promise<StudentLessonProgressDto> {
    const context = await assertStudentLessonAccess({ userId, courseId, lessonId })
    if (context.lesson.lessonType !== 'VIDEO') {
      throw ApiError.badRequest('Only video lessons track a playback position')
    }

    // Never trust a client-supplied duration — the only authoritative duration is the lesson's own Cloudinary-verified `videoAsset.durationSeconds`. Position is clamped to it (+5s tolerance) so a malicious payload can't claim an absurd position.
    const duration = context.lesson.videoAsset?.durationSeconds ?? null
    const clampedPosition = duration
      ? Math.min(input.positionSeconds, duration + 5)
      : input.positionSeconds

    const existing = await lessonProgressRepository.findByStudentAndLesson(
      context.student._id.toString(),
      lessonId,
    )
    const now = new Date()

    if (existing?.status === 'COMPLETED') {
      // Position can keep advancing (via $max) after completion, but status/completedAt are never touched again — idempotent, no timestamp corruption.
      const updated = await lessonProgressRepository.upsertProgress({
        studentId: context.student._id.toString(),
        courseId,
        lessonId,
        enrollmentId: context.enrollment._id.toString(),
        status: 'COMPLETED',
        videoPositionSeconds: clampedPosition,
        startedAt: now,
        lastAccessedAt: now,
      })
      return toLessonProgressDto(updated)
    }

    const crossedThreshold =
      duration !== null &&
      duration > 0 &&
      clampedPosition >= duration * VIDEO_COMPLETION_THRESHOLD_RATIO

    const updated = await lessonProgressRepository.upsertProgress({
      studentId: context.student._id.toString(),
      courseId,
      lessonId,
      enrollmentId: context.enrollment._id.toString(),
      status: crossedThreshold ? 'COMPLETED' : 'IN_PROGRESS',
      videoPositionSeconds: clampedPosition,
      startedAt: now,
      lastAccessedAt: now,
      ...(crossedThreshold
        ? { completedAt: now, completionSource: 'VIDEO_THRESHOLD' as const }
        : {}),
    })
    return toLessonProgressDto(updated)
  },

  async markLessonComplete(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<StudentLessonProgressDto> {
    const context = await assertStudentLessonAccess({ userId, courseId, lessonId })
    if (context.lesson.lessonType === 'VIDEO') {
      throw ApiError.badRequest('Video lessons complete automatically once watched')
    }

    // Read-then-upsert (not a single conditional atomic op) — the unique-index upsert still guarantees no duplicate row under a rare double-click race; the only accepted tradeoff is which of two near-simultaneous `completedAt` values wins, which is immaterial for a manual "mark complete" action.
    const existing = await lessonProgressRepository.findByStudentAndLesson(
      context.student._id.toString(),
      lessonId,
    )
    if (existing?.status === 'COMPLETED') {
      return toLessonProgressDto(existing)
    }

    const now = new Date()
    const updated = await lessonProgressRepository.upsertProgress({
      studentId: context.student._id.toString(),
      courseId,
      lessonId,
      enrollmentId: context.enrollment._id.toString(),
      status: 'COMPLETED',
      startedAt: now,
      lastAccessedAt: now,
      completedAt: now,
      completionSource: 'MANUAL',
    })
    return toLessonProgressDto(updated)
  },
}
