export interface CourseProgressLessonInput {
  id: string
  moduleOrder: number
  order: number
  isMandatory: boolean
}

export interface CourseProgressRow {
  lessonId: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  lastAccessedAt: Date | null
}

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

/**
 * The single course-completion algorithm, shared by the course-progress
 * endpoint, the enriched course-overview curriculum, and the My
 * Courses/Dashboard progress bars — computed fresh from lesson progress +
 * the published curriculum every time, never read from a stored
 * percentage. `lessons` must already be filtered to published lessons
 * belonging to a published module (draft/archived never counted) and
 * sorted by module order then lesson order — this function doesn't
 * re-derive either.
 *
 * Denominator rule: mandatory published lessons if any exist, otherwise
 * every published lesson (task's own documented fallback) — never draft,
 * archived, or soft-deleted lessons, which are excluded before this
 * function ever sees them.
 */
export function computeCourseProgress(
  lessons: readonly CourseProgressLessonInput[],
  progressRows: readonly CourseProgressRow[],
): CourseProgressSummary {
  const sorted = [...lessons].sort((a, b) =>
    a.moduleOrder === b.moduleOrder ? a.order - b.order : a.moduleOrder - b.moduleOrder,
  )

  const statusById = new Map(progressRows.map((row) => [row.lessonId, row.status]))
  const mandatory = sorted.filter((lesson) => lesson.isMandatory)
  const denominator = mandatory.length > 0 ? mandatory : sorted

  const completedLessons = sorted.filter(
    (lesson) => statusById.get(lesson.id) === 'COMPLETED',
  ).length
  const completedMandatoryLessons = denominator.filter(
    (lesson) => statusById.get(lesson.id) === 'COMPLETED',
  ).length

  const percentage =
    denominator.length === 0
      ? 0
      : Math.min(
          100,
          Math.max(0, Math.round((completedMandatoryLessons / denominator.length) * 100)),
        )

  let lastAccessedLessonId: string | null = null
  let lastAccessedAt: Date | null = null
  for (const row of progressRows) {
    if (row.lastAccessedAt && (!lastAccessedAt || row.lastAccessedAt > lastAccessedAt)) {
      lastAccessedAt = row.lastAccessedAt
      lastAccessedLessonId = row.lessonId
    }
  }

  return {
    totalLessons: sorted.length,
    completedLessons,
    mandatoryLessons: denominator.length,
    completedMandatoryLessons,
    percentage,
    isComplete: denominator.length > 0 && completedMandatoryLessons === denominator.length,
    lastAccessedLessonId,
    lastAccessedAt: lastAccessedAt ? lastAccessedAt.toISOString() : null,
    firstLessonId: sorted[0]?.id ?? null,
  }
}
