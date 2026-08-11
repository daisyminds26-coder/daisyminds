import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(callback: () => void): () => void {
  const mediaQueryList = window.matchMedia(QUERY)
  mediaQueryList.addEventListener('change', callback)
  return () => {
    mediaQueryList.removeEventListener('change', callback)
  }
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

/** The single source of truth every motion primitive in `components/motion/` checks before animating. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
