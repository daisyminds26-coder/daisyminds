/** `lessonId` requires `prerequisiteLessonIds` — the edge direction cycle detection walks. */
export interface LessonPrerequisiteEdge {
  lessonId: string
  prerequisiteLessonIds: string[]
}

/**
 * Would adding the edge `lessonId -> newPrerequisiteId` close a cycle?
 * True iff `lessonId` is already reachable *from* `newPrerequisiteId` by
 * following existing prerequisite edges — i.e. `newPrerequisiteId`
 * (transitively) already depends on `lessonId`, so requiring it back would
 * close the loop. Plain iterative DFS over an adjacency map built once per
 * call — course-scale graphs (hundreds of lessons) make this trivially
 * cheap; no need for anything fancier.
 */
export function wouldCreateCycle(
  edges: readonly LessonPrerequisiteEdge[],
  lessonId: string,
  newPrerequisiteId: string,
): boolean {
  if (lessonId === newPrerequisiteId) return true

  const graph = new Map<string, string[]>()
  for (const edge of edges) graph.set(edge.lessonId, edge.prerequisiteLessonIds)

  const visited = new Set<string>()
  const stack = [newPrerequisiteId]

  while (stack.length > 0) {
    const current = stack.pop()
    if (current === undefined) continue
    if (current === lessonId) return true
    if (visited.has(current)) continue
    visited.add(current)
    for (const next of graph.get(current) ?? []) stack.push(next)
  }

  return false
}

/**
 * Checks a lesson's *entire* proposed prerequisite set against the rest of
 * the course's existing edges (the lesson's own current edge excluded by
 * the caller, since it's being replaced, not added to). Returns the first
 * offending prerequisite id, or `null` if the whole set is cycle-free.
 */
export function findCyclicPrerequisite(
  otherEdges: readonly LessonPrerequisiteEdge[],
  lessonId: string,
  newPrerequisiteIds: readonly string[],
): string | null {
  for (const prerequisiteId of newPrerequisiteIds) {
    if (wouldCreateCycle(otherEdges, lessonId, prerequisiteId)) return prerequisiteId
  }
  return null
}

/**
 * Full-graph scan (3-color DFS) used only by the curriculum readiness
 * check — a defense-in-depth safety net, not the primary guard. Every
 * write path already rejects a cycle-introducing edge via
 * `findCyclicPrerequisite` above, so stored data should never actually
 * contain one; this exists to surface it as a readiness blocker rather
 * than silently trust that invariant forever.
 */
export function hasCycle(edges: readonly LessonPrerequisiteEdge[]): boolean {
  const graph = new Map<string, string[]>()
  for (const edge of edges) graph.set(edge.lessonId, edge.prerequisiteLessonIds)

  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()

  function visit(node: string): boolean {
    color.set(node, GRAY)
    for (const next of graph.get(node) ?? []) {
      const state = color.get(next) ?? WHITE
      if (state === GRAY) return true
      if (state === WHITE && visit(next)) return true
    }
    color.set(node, BLACK)
    return false
  }

  for (const edge of edges) {
    if ((color.get(edge.lessonId) ?? WHITE) === WHITE && visit(edge.lessonId)) return true
  }
  return false
}
