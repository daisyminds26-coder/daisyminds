import { describe, expect, it } from 'vitest'

import { findSetMismatch, normalizeOrders } from '../../src/utils/curriculum-order.util'

describe('findSetMismatch', () => {
  it('reports no mismatch when the payload names every existing id exactly once', () => {
    const result = findSetMismatch(['a', 'b', 'c'], [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(result).toEqual({ missingIds: [], unknownIds: [] })
  })

  it('reports an id the payload omitted', () => {
    const result = findSetMismatch(['a', 'b'], [{ id: 'a' }])
    expect(result.missingIds).toEqual(['b'])
    expect(result.unknownIds).toEqual([])
  })

  it('reports an id the payload invented', () => {
    const result = findSetMismatch(['a'], [{ id: 'a' }, { id: 'x' }])
    expect(result.missingIds).toEqual([])
    expect(result.unknownIds).toEqual(['x'])
  })
})

describe('normalizeOrders', () => {
  it('re-derives a contiguous 0-based order from the relative ranking submitted', () => {
    const result = normalizeOrders([
      { id: 'c', order: 30 },
      { id: 'a', order: 10 },
      { id: 'b', order: 20 },
    ])
    expect(result).toEqual([
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
      { id: 'c', order: 2 },
    ])
  })
})
