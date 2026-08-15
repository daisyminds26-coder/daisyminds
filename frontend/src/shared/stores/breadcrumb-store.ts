import { create } from 'zustand'

import type { BreadcrumbSegment } from '@/shared/components/layout/page-breadcrumb'

interface BreadcrumbState {
  /** Set by a page via `usePageBreadcrumb` when the URL alone can't produce a readable trail (e.g. a Mongo id needs to show as the resource's real name). `null` falls back to `PageBreadcrumb`'s URL auto-derivation. */
  segments: readonly BreadcrumbSegment[] | null
  setSegments: (segments: readonly BreadcrumbSegment[]) => void
  clearSegments: () => void
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  segments: null,
  setSegments: (segments) => { set({ segments }); },
  clearSegments: () => { set({ segments: null }); },
}))
