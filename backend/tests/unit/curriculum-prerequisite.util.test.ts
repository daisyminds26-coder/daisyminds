import { describe, expect, it } from 'vitest'

import {
  findCyclicPrerequisite,
  hasCycle,
  wouldCreateCycle,
  type LessonPrerequisiteEdge,
} from '../../src/utils/curriculum-prerequisite.util'

describe('wouldCreateCycle', () => {
  it('rejects a lesson requiring itself', () => {
    expect(wouldCreateCycle([], 'A', 'A')).toBe(true)
  })

  it('allows a simple, acyclic new edge', () => {
    const edges: LessonPrerequisiteEdge[] = [{ lessonId: 'B', prerequisiteLessonIds: ['C'] }]
    expect(wouldCreateCycle(edges, 'A', 'B')).toBe(false)
  })

  it('detects a direct cycle (A requires B, B already requires A)', () => {
    const edges: LessonPrerequisiteEdge[] = [{ lessonId: 'B', prerequisiteLessonIds: ['A'] }]
    expect(wouldCreateCycle(edges, 'A', 'B')).toBe(true)
  })

  it('detects an indirect cycle (A->B, B->C, adding C->A)', () => {
    const edges: LessonPrerequisiteEdge[] = [
      { lessonId: 'A', prerequisiteLessonIds: ['B'] },
      { lessonId: 'B', prerequisiteLessonIds: ['C'] },
    ]
    expect(wouldCreateCycle(edges, 'C', 'A')).toBe(true)
  })

  it('does not falsely flag a diamond dependency (not a cycle)', () => {
    const edges: LessonPrerequisiteEdge[] = [
      { lessonId: 'B', prerequisiteLessonIds: ['A'] },
      { lessonId: 'C', prerequisiteLessonIds: ['A'] },
    ]
    expect(wouldCreateCycle(edges, 'D', 'B')).toBe(false)
  })
})

describe('findCyclicPrerequisite', () => {
  it('returns null when every candidate prerequisite is cycle-free', () => {
    const edges: LessonPrerequisiteEdge[] = [{ lessonId: 'B', prerequisiteLessonIds: [] }]
    expect(findCyclicPrerequisite(edges, 'A', ['B'])).toBeNull()
  })

  it('returns the first offending prerequisite id', () => {
    const edges: LessonPrerequisiteEdge[] = [{ lessonId: 'B', prerequisiteLessonIds: ['A'] }]
    expect(findCyclicPrerequisite(edges, 'A', ['B'])).toBe('B')
  })
})

describe('hasCycle', () => {
  it('returns false for an empty or acyclic graph', () => {
    expect(hasCycle([])).toBe(false)
    expect(
      hasCycle([
        { lessonId: 'A', prerequisiteLessonIds: ['B'] },
        { lessonId: 'B', prerequisiteLessonIds: ['C'] },
      ]),
    ).toBe(false)
  })

  it('detects the exact cycle from the task spec: A->B->C->A', () => {
    expect(
      hasCycle([
        { lessonId: 'A', prerequisiteLessonIds: ['B'] },
        { lessonId: 'B', prerequisiteLessonIds: ['C'] },
        { lessonId: 'C', prerequisiteLessonIds: ['A'] },
      ]),
    ).toBe(true)
  })
})
