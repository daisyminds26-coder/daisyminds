import { useQuery } from '@tanstack/react-query'

import {
  checkCurriculumReadiness,
  getCurriculum,
} from '@/features/courses/curriculum/api/curriculum.api'
import { curriculumKeys } from '@/features/courses/curriculum/api/query-keys'

export function useCurriculum(courseId: string | undefined) {
  return useQuery({
    queryKey: curriculumKeys.tree(courseId ?? ''),
    queryFn: () => getCurriculum(courseId ?? ''),
    enabled: courseId !== undefined,
  })
}

/** A `POST` that reads, not a `GET` (backend computes it fresh, not cached) — still driven through `useQuery` so the builder page refetches it exactly when the tree itself refetches. */
export function useCurriculumReadiness(courseId: string | undefined) {
  return useQuery({
    queryKey: curriculumKeys.readiness(courseId ?? ''),
    queryFn: () => checkCurriculumReadiness(courseId ?? ''),
    enabled: courseId !== undefined,
  })
}
