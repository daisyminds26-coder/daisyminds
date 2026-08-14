import { ApiError } from '../utils/api-error'
import { isLessonUnlocked } from '../utils/prerequisite-lock.util'
import {
  computeEnrollmentAccessState,
  hasLearningAccess,
  type EnrollmentAccessState,
} from './enrollment-access.service'
import { resolveStudentForUser } from './student-identity.util'
import { courseRepository } from '../repositories/course.repository'
import { curriculumRepository } from '../repositories/curriculum.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { lessonProgressRepository } from '../repositories/lesson-progress.repository'
import type { StudentDocument } from '../models/student.model'
import type { CourseDocument } from '../models/course.model'
import type { CourseModuleDocument } from '../models/course-module.model'
import type { EnrollmentDocument } from '../models/enrollment.model'
import type { LessonDocument } from '../models/lesson.model'

const LOCK_REASON = 'Complete the required lesson first.'

export interface StudentLessonAccessContext {
  student: StudentDocument
  course: CourseDocument
  enrollment: EnrollmentDocument
  lesson: LessonDocument
  courseModule: CourseModuleDocument
  accessState: EnrollmentAccessState
  hasAccess: boolean
  locked: boolean
  lockReason: string | null
  /** Every lesson id this student has completed in this course — reused by callers computing curriculum-wide lock state without a second query. */
  completedLessonIds: Set<string>
}

/**
 * The single central resolver every student-lesson route goes through
 * (task's own explicit instruction — no controller re-implements this
 * chain). Verifies, in order: student exists → course exists → the student
 * has *some* enrollment for this course (else 404, never disclosing course
 * existence to an uninvolved student) → the lesson exists, is `PUBLISHED`,
 * and belongs to this course → its parent module is also `PUBLISHED`
 * (a published lesson under an archived/draft module is still hidden,
 * matching Phase 11A's course-overview curriculum filter). Prerequisite
 * lock state is computed but never thrown — callers decide whether a
 * locked/suspended lesson gets a graceful "soft" response (lesson detail)
 * or a hard deny (protected media), via `assertStudentLessonAccess` below.
 */
export async function resolveStudentLessonAccess(input: {
  userId: string
  courseId: string
  lessonId: string
}): Promise<StudentLessonAccessContext> {
  const student = await resolveStudentForUser(input.userId)

  const course = await courseRepository.findById(input.courseId)
  if (!course) throw ApiError.notFound('Course not found')

  const enrollment = await enrollmentRepository.findLatestByStudentAndCourse(
    student._id.toString(),
    input.courseId,
  )
  if (!enrollment) throw ApiError.notFound('Course not found')

  const lesson = await curriculumRepository.findLessonById(input.courseId, input.lessonId)
  if (lesson?.status !== 'PUBLISHED') throw ApiError.notFound('Lesson not found')

  const courseModule = await curriculumRepository.findModuleById(
    input.courseId,
    lesson.courseModuleId.toString(),
  )
  if (courseModule?.status !== 'PUBLISHED') {
    throw ApiError.notFound('Lesson not found')
  }

  const progressRows = await lessonProgressRepository.findAllByStudentAndCourse(
    student._id.toString(),
    input.courseId,
  )
  const completedLessonIds = new Set(
    progressRows.filter((row) => row.status === 'COMPLETED').map((row) => row.lessonId.toString()),
  )
  const unlocked = isLessonUnlocked(
    lesson.prerequisiteLessonIds.map((id) => id.toString()),
    completedLessonIds,
  )

  return {
    student,
    course,
    enrollment,
    lesson,
    courseModule,
    accessState: computeEnrollmentAccessState(enrollment),
    hasAccess: hasLearningAccess(enrollment),
    locked: !unlocked,
    lockReason: unlocked ? null : LOCK_REASON,
    completedLessonIds,
  }
}

/**
 * The hard gate — used before ever issuing protected content (a signed
 * media URL, or accepting a progress-mutating write). Unlike
 * `resolveStudentLessonAccess`, this never returns a "soft" locked/
 * suspended context: no entitlement or a locked prerequisite both throw
 * `403`, so a caller that only wants to serve real content never has to
 * remember to re-check the flags themselves.
 */
export async function assertStudentLessonAccess(input: {
  userId: string
  courseId: string
  lessonId: string
}): Promise<StudentLessonAccessContext> {
  const context = await resolveStudentLessonAccess(input)
  if (!context.hasAccess) throw ApiError.forbidden('You do not have access to this course')
  if (context.locked) throw ApiError.forbidden(context.lockReason ?? 'This lesson is locked')
  return context
}
