import {
  LessonProgressModel,
  type LessonProgressDocument,
  type LessonProgressStatus,
  type ProgressCompletionSource,
} from '../models/lesson-progress.model'

export interface UpsertProgressInput {
  studentId: string
  courseId: string
  lessonId: string
  enrollmentId: string
  status: LessonProgressStatus
  videoPositionSeconds?: number
  startedAt?: Date
  lastAccessedAt: Date
  completedAt?: Date | null
  completionSource?: ProgressCompletionSource | null
}

export const lessonProgressRepository = {
  findByStudentAndLesson(
    studentId: string,
    lessonId: string,
  ): Promise<LessonProgressDocument | null> {
    return LessonProgressModel.findOne({ studentId, lessonId })
  },

  /** Every progress row a student has for one course — the course-progress algorithm's single read. */
  findAllByStudentAndCourse(
    studentId: string,
    courseId: string,
  ): Promise<LessonProgressDocument[]> {
    return LessonProgressModel.find({ studentId, courseId })
  },

  /** Batched across several courses at once (My Courses / Dashboard progress bars) — one query, never one per enrollment. */
  findAllByStudentAndCourses(
    studentId: string,
    courseIds: string[],
  ): Promise<LessonProgressDocument[]> {
    if (courseIds.length === 0) return Promise.resolve([])
    return LessonProgressModel.find({ studentId, courseId: { $in: courseIds } })
  },

  /**
   * Atomic upsert keyed on `{studentId, lessonId}` — the sole write path for
   * progress, so "mark complete" called twice, or a video heartbeat racing
   * a manual complete, can never produce a duplicate row or double-apply a
   * transition. `$max` on `videoPositionSeconds` means a late/out-of-order
   * heartbeat can never regress a further-along position.
   */
  async upsertProgress(input: UpsertProgressInput): Promise<LessonProgressDocument> {
    const setOnInsert: Record<string, unknown> = {
      studentId: input.studentId,
      courseId: input.courseId,
      lessonId: input.lessonId,
    }
    const set: Record<string, unknown> = {
      enrollmentId: input.enrollmentId,
      status: input.status,
      lastAccessedAt: input.lastAccessedAt,
    }
    if (input.startedAt) setOnInsert.startedAt = input.startedAt
    if (input.completedAt !== undefined) set.completedAt = input.completedAt
    if (input.completionSource !== undefined) set.completionSource = input.completionSource

    const update: Record<string, unknown> = { $set: set, $setOnInsert: setOnInsert }
    if (input.videoPositionSeconds !== undefined) {
      update.$max = { videoPositionSeconds: input.videoPositionSeconds }
    }

    return LessonProgressModel.findOneAndUpdate(
      { studentId: input.studentId, lessonId: input.lessonId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  },
}
