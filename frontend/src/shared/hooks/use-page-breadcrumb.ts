import { useEffect } from 'react'

import { useBreadcrumbStore } from '@/shared/stores/breadcrumb-store'
import type { BreadcrumbSegment } from '@/shared/components/layout/page-breadcrumb'

/**
 * Registers an explicit breadcrumb trail for the current page (e.g. showing
 * a resource's real name instead of its id) — cleared automatically on
 * unmount, so the next page falls back to `PageBreadcrumb`'s URL
 * auto-derivation. `segments` should be memoized (e.g. `useMemo`) by the
 * caller so this effect doesn't re-fire every render.
 */
export function usePageBreadcrumb(segments: readonly BreadcrumbSegment[] | undefined): void {
  const setSegments = useBreadcrumbStore((state) => state.setSegments)
  const clearSegments = useBreadcrumbStore((state) => state.clearSegments)

  useEffect(() => {
    if (!segments) return
    setSegments(segments)
    return () => { clearSegments(); }
  }, [segments, setSegments, clearSegments])
}
