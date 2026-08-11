import { studentRepository } from '../repositories/student.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { ApiError } from '../utils/api-error'
import type { EnrollmentDocument } from '../models/enrollment.model'

/**
 * The single authoritative "does this enrollment currently grant learning
 * access" rule (ARCHITECTURE.md §23) — reused by every future consumer
 * (Learning Player, media/lesson APIs, progress tracking, certificates)
 * rather than each reimplementing this check against raw `status`/date
 * fields. `SUSPENDED` is an explicit denial regardless of dates (a
 * temporary access revocation, not a window edit); `COMPLETED` retains
 * access only while `accessEndsAt` is null (lifetime) or still in the
 * future — see `enrollment.model.ts`'s doc comment for why the access
 * window exists at all.
 */
export function hasLearningAccess(
  enrollment: Pick<EnrollmentDocument, 'status' | 'accessStartsAt' | 'accessEndsAt'>,
  now: Date = new Date(),
): boolean {
  if (enrollment.status === 'ACTIVE') {
    return !enrollment.accessStartsAt || enrollment.accessStartsAt <= now
  }
  if (enrollment.status === 'COMPLETED') {
    return !enrollment.accessEndsAt || enrollment.accessEndsAt > now
  }
  return false
}

export const ENROLLMENT_ACCESS_STATES = [
  'ACTIVE',
  'LIFETIME',
  'NOT_YET_ACTIVE',
  'SUSPENDED',
  'ENDED',
  'NONE',
] as const
export type EnrollmentAccessState = (typeof ENROLLMENT_ACCESS_STATES)[number]

/**
 * A finer-grained view of `hasLearningAccess` for admin-UI display only
 * (Phase 10B Part 2) — the boolean rule above stays the actual entitlement
 * gate; this exists so the frontend never has to reimplement the
 * status/date reasoning itself to render a badge (task's own explicit
 * instruction: "add a small safe field ... rather than duplicating complex
 * logic frontend-side"). `NOT_YET_ACTIVE` is unreachable via any write path
 * today (nothing ever future-dates `accessStartsAt`) but is included for
 * schema-forward-compatibility at zero cost.
 */
export function computeEnrollmentAccessState(
  enrollment: Pick<EnrollmentDocument, 'status' | 'accessStartsAt' | 'accessEndsAt'>,
  now: Date = new Date(),
): EnrollmentAccessState {
  if (enrollment.status === 'SUSPENDED') return 'SUSPENDED'
  if (enrollment.status === 'ACTIVE') {
    if (enrollment.accessStartsAt && enrollment.accessStartsAt > now) return 'NOT_YET_ACTIVE'
    return 'ACTIVE'
  }
  if (enrollment.status === 'COMPLETED') {
    if (!enrollment.accessEndsAt) return 'LIFETIME'
    return enrollment.accessEndsAt > now ? 'ACTIVE' : 'ENDED'
  }
  return 'NONE'
}

export const enrollmentAccessService = {
  hasLearningAccess,

  /** The enrollment (if any) currently granting a student access to a course — indexed lookup, never a full scan. */
  getActiveEnrollmentForStudentCourse(
    studentId: string,
    courseId: string,
  ): Promise<EnrollmentDocument | null> {
    return enrollmentRepository.findAccessGrantingForStudentCourse(studentId, courseId)
  },

  /**
   * Reusable guard for future course-scoped student endpoints (Learning
   * Player, lesson content, media delivery) — resolves the linked student
   * profile from the authenticated user's own id (never trusts a
   * client-supplied `studentId`) and throws `403` if no enrollment
   * currently grants access. Not wired into any route this phase (no
   * consumer exists yet) — provided so Phase 11+ can import it unchanged.
   */
  async assertStudentCourseAccess(input: { userId: string; courseId: string }): Promise<void> {
    const student = await studentRepository.findByUserId(input.userId)
    if (!student) throw ApiError.forbidden('No student profile linked to this account')

    const enrollment = await enrollmentRepository.findAccessGrantingForStudentCourse(
      student._id.toString(),
      input.courseId,
    )
    if (!enrollment) throw ApiError.forbidden('You do not have access to this course')
  },
}
