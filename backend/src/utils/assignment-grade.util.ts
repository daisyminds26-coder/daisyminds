export type PassStatus = 'PASS' | 'FAIL'

/**
 * `percentage`/`passStatus` are never stored — always derived fresh from
 * `marksAwarded` + the parent assignment's `maxMarks`/`passingMarks`, same
 * "never store what's computable" rule Phase 12's attendance-percentage
 * formula established. `passStatus` is `null` when not applicable — either
 * still ungraded, or the assignment has no `passingMarks` threshold
 * configured at all (not every assignment needs a pass/fail concept). The
 * one function every DTO (admin, trainer, student) calls, so there is
 * exactly one place this math lives.
 */
export function computeGrade(
  marksAwarded: number | null,
  maxMarks: number,
  passingMarks: number | null,
): { percentage: number | null; passStatus: PassStatus | null } {
  if (marksAwarded === null) return { percentage: null, passStatus: null }

  const percentage = maxMarks > 0 ? Math.round((marksAwarded / maxMarks) * 100) : 0
  const passStatus = passingMarks === null ? null : marksAwarded >= passingMarks ? 'PASS' : 'FAIL'
  return { percentage, passStatus }
}
