/**
 * Reads a single query-string value from the current URL, once, at initial
 * render — used as a `useState(() => readInitialQueryParam('status'))`
 * lazy initializer so a deep link (e.g. an admin-dashboard alert's
 * `actionRoute`, SECURITY.md §4 — always an allowlisted, server-built
 * route) can seed a list page's filter state without a `useSearchParams`
 * effect/re-render cycle. Deliberately read-only and one-shot: pages that
 * use this never sync filter state back into the URL.
 */
export function readInitialQueryParam(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  return new URLSearchParams(window.location.search).get(key) ?? undefined
}
