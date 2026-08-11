export interface ReorderRequestItem {
  id: string
  order: number
}

export interface OrderUpdate {
  id: string
  order: number
}

export interface SetMismatch {
  /** Ids the reorder payload was missing — an existing active sibling that would otherwise silently lose its position. */
  missingIds: string[]
  /** Ids in the payload that aren't a current active sibling of this course/module. */
  unknownIds: string[]
}

/**
 * A reorder request must name *every* current active sibling exactly once
 * — never a partial list. A partial reorder is ambiguous (where do the
 * unlisted siblings end up?) and the frontend always has the complete
 * sibling list in view anyway (it's rendering the whole tree), so sending
 * the complete set back costs nothing and removes the ambiguity entirely.
 */
export function findSetMismatch(
  existingIds: readonly string[],
  items: readonly { id: string }[],
): SetMismatch {
  const existingSet = new Set(existingIds)
  const submittedIds = items.map((item) => item.id)
  const submittedSet = new Set(submittedIds)

  return {
    missingIds: existingIds.filter((id) => !submittedSet.has(id)),
    unknownIds: submittedIds.filter((id) => !existingSet.has(id)),
  }
}

/**
 * Re-derives a contiguous 0-based order from the *relative* ordering the
 * client submitted — only the ranking of the submitted `order` values
 * matters, never their literal magnitude, so a client-side drag-drop
 * library's own numbering scheme never has to match the backend's exactly.
 */
export function normalizeOrders(items: readonly ReorderRequestItem[]): OrderUpdate[] {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ id: item.id, order: index }))
}
