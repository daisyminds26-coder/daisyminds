import { useQueries } from '@tanstack/react-query'

import { listCourses } from '@/features/courses/api/courses.api'
import { coursesKeys } from '@/features/courses/api/query-keys'
import type { CourseStatus } from '@/features/courses/types'

/** No dedicated stats endpoint exists (deliberately — mirrors the users/students/trainers modules' "cheap `meta.total` of a `limit: 1` list call" approach). */
function buildCountQuery(filter: { status?: CourseStatus } = {}) {
  const params = { page: 1, limit: 1, ...filter }
  return {
    queryKey: coursesKeys.list(params),
    queryFn: () => listCourses(params),
  }
}

export function useCourseStats() {
  const results = useQueries({
    queries: [
      buildCountQuery(),
      buildCountQuery({ status: 'PUBLISHED' }),
      buildCountQuery({ status: 'DRAFT' }),
      buildCountQuery({ status: 'ARCHIVED' }),
    ],
  })

  const [total, published, draft, archived] = results

  return {
    isLoading: results.some((result) => result.isLoading),
    total: total.data?.meta.total ?? 0,
    published: published.data?.meta.total ?? 0,
    draft: draft.data?.meta.total ?? 0,
    archived: archived.data?.meta.total ?? 0,
  }
}
