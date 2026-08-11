import { useMutation, useQuery } from '@tanstack/react-query'

import { checkReadiness } from '@/features/courses/api/courses.api'
import { coursesKeys } from '@/features/courses/api/query-keys'

/** Read-only readiness snapshot for the detail page's "publication readiness" panel. */
export function useCourseReadiness(id: string | undefined) {
  return useQuery({
    queryKey: coursesKeys.readiness(id ?? ''),
    queryFn: () => checkReadiness(id ?? ''),
    enabled: id !== undefined,
  })
}

/** Re-checks on demand (e.g. right before a manual "Publish" click) without needing a query invalidation. */
export function useCheckReadiness() {
  return useMutation({
    mutationFn: (id: string) => checkReadiness(id),
  })
}
