import { ApiError } from '../utils/api-error'
import {
  findCyclicPrerequisite,
  type LessonPrerequisiteEdge,
} from '../utils/curriculum-prerequisite.util'
import { auditLogRepository } from '../repositories/audit-log.repository'
import { courseRepository } from '../repositories/course.repository'
import { curriculumRepository } from '../repositories/curriculum.repository'
import type { CourseDocument } from '../models/course.model'
import type { CourseModuleDocument } from '../models/course-module.model'
import type { LessonDocument } from '../models/lesson.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

/**
 * Curriculum audit events are recorded against the parent *course*
 * (`entityType: 'course'`, `entityId: courseId`) rather than a
 * `course_module`/`lesson` entity of their own — a deliberate reuse of the
 * existing `GET /courses/:id/audit` endpoint/UI (ARCHITECTURE.md §20)
 * instead of standing up a second audit-read surface. The specific
 * module/lesson affected always travels in `metadata`.
 */
const AUDIT_ENTITY_TYPE = 'course'

export async function recordCurriculumAudit(
  courseId: string,
  action: string,
  actor: AuthenticatedUser,
  context: RequestContext,
  metadata: Record<string, unknown>,
): Promise<void> {
  await auditLogRepository.record({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityType: AUDIT_ENTITY_TYPE,
    entityId: courseId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

export async function assertCourseExists(courseId: string): Promise<CourseDocument> {
  const course = await courseRepository.findById(courseId)
  if (!course) throw ApiError.notFound('Course not found')
  return course
}

/** Reads are always allowed; every write path calls this instead of `assertCourseExists` — an archived course's curriculum is read-only (ARCHITECTURE.md §20). */
export async function assertEditableCourse(courseId: string): Promise<CourseDocument> {
  const course = await assertCourseExists(courseId)
  if (course.status === 'ARCHIVED') {
    throw ApiError.conflict('Curriculum is read-only while the course is archived')
  }
  return course
}

export async function requireModule(
  courseId: string,
  moduleId: string,
): Promise<CourseModuleDocument> {
  const module = await curriculumRepository.findModuleById(courseId, moduleId)
  if (!module) throw ApiError.notFound('Module not found')
  return module
}

export async function requireLesson(courseId: string, lessonId: string): Promise<LessonDocument> {
  const lesson = await curriculumRepository.findLessonById(courseId, lessonId)
  if (!lesson) throw ApiError.notFound('Lesson not found')
  return lesson
}

/** Every single-lesson route is nested under `.../modules/:moduleId/lessons/:lessonId/...` — this rejects a URL whose `moduleId` segment doesn't actually match the lesson's real module, rather than silently ignoring it. */
export function assertLessonInModule(lesson: LessonDocument, moduleId: string): void {
  if (lesson.courseModuleId.toString() !== moduleId) {
    throw ApiError.notFound('Lesson not found in this module')
  }
}

export async function assertValidPrerequisites(
  courseId: string,
  lessonId: string | undefined,
  prerequisiteLessonIds: string[],
): Promise<void> {
  if (prerequisiteLessonIds.length === 0) return

  if (lessonId && prerequisiteLessonIds.includes(lessonId)) {
    throw ApiError.badRequest('A lesson cannot be its own prerequisite', [
      { field: 'prerequisiteLessonIds', message: 'A lesson cannot be its own prerequisite' },
    ])
  }

  const courseLessons = await curriculumRepository.findLessonsByCourse(courseId)
  const validIds = new Set(courseLessons.map((lesson) => lesson._id.toString()))
  const invalid = prerequisiteLessonIds.filter((id) => !validIds.has(id))
  if (invalid.length > 0) {
    throw ApiError.badRequest('One or more prerequisite lessons do not exist in this course', [
      {
        field: 'prerequisiteLessonIds',
        message: 'All prerequisite lessons must exist in this course',
      },
    ])
  }

  if (lessonId) {
    const otherEdges: LessonPrerequisiteEdge[] = courseLessons
      .filter((lesson) => lesson._id.toString() !== lessonId)
      .map((lesson) => ({
        lessonId: lesson._id.toString(),
        prerequisiteLessonIds: lesson.prerequisiteLessonIds.map((id) => id.toString()),
      }))
    const cyclic = findCyclicPrerequisite(otherEdges, lessonId, prerequisiteLessonIds)
    if (cyclic) {
      throw ApiError.badRequest('This prerequisite would create a circular dependency', [
        {
          field: 'prerequisiteLessonIds',
          message: 'This prerequisite would create a circular dependency',
        },
      ])
    }
  }
}
