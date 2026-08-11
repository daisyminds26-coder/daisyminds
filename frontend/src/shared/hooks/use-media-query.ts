import { useSyncExternalStore } from 'react'

/**
 * SSR-safe media query hook built on `useSyncExternalStore` so the
 * subscribe/snapshot contract (and StrictMode double-invocation) is handled
 * correctly without a manual `useEffect` + `useState` dance.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', onChange)
      return () => {
        mediaQueryList.removeEventListener('change', onChange)
      }
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** UI-DESIGN-SYSTEM.md §5 breakpoints: `md` (768px) is the tablet/desktop split. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

/** Below `lg` (1024px): tablet and mobile both collapse the full sidebar. */
export function useIsTabletOrBelow(): boolean {
  return useMediaQuery('(max-width: 1023px)')
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
