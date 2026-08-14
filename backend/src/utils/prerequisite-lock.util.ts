/**
 * A lesson is unlocked once every one of its prerequisites is `COMPLETED`
 * for this student. No prerequisites means always unlocked. Cycle-safety
 * is guaranteed at write time (`curriculum-prerequisite.util.ts`'s
 * `findCyclicPrerequisite`/`hasCycle`), so this is a plain set check, never
 * a graph walk.
 */
export function isLessonUnlocked(
  prerequisiteLessonIds: readonly string[],
  completedLessonIds: ReadonlySet<string>,
): boolean {
  return prerequisiteLessonIds.every((id) => completedLessonIds.has(id))
}
