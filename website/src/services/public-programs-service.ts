import { API_BASE_URL } from '@/utils/env'
import type { Program, ProgramListItem } from '@/types/program'

export class PublicProgramsApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'PublicProgramsApiError'
    this.status = status
    this.code = code
  }
}

async function toApiError(response: Response): Promise<PublicProgramsApiError> {
  try {
    const body = (await response.json()) as { message?: string; code?: string }
    return new PublicProgramsApiError(
      body.message ?? 'Something went wrong. Please try again.',
      response.status,
      body.code ?? 'UNKNOWN_ERROR',
    )
  } catch {
    return new PublicProgramsApiError(
      'Something went wrong. Please try again.',
      response.status,
      'UNKNOWN_ERROR',
    )
  }
}

/**
 * Short in-module cache + in-flight de-dup, keyed by request URL. Matches
 * the backend's own `Cache-Control: public, max-age=60` (`public-programs.
 * controller.ts`) — a page reload after that window sees a fresh publish
 * within roughly a minute, never indefinitely stale. This also fixes the
 * previous static-data era's incidental bug where `Navbar` and
 * `ProgramsMegaMenu` each independently re-fetched the full program list on
 * every page load — they now share one cached/in-flight request.
 *
 * Failures are cached too, just for a much shorter window
 * (`FAILURE_CACHE_TTL_MS`) — this is a circuit breaker, not just a cache.
 * `fetch()` against a refused connection (backend down) rejects in
 * ~0ms, so any repeated caller (a render loop, a retry button mashed, a
 * Suspense/error-boundary interaction) previously re-hit the network on
 * every single attempt with zero cooldown, once actually observed hammering
 * a down backend with 40,000+ requests in seconds. Caching the rejection
 * briefly guarantees at most one real network attempt per cooldown window,
 * no matter how many times a caller asks.
 */
const CACHE_TTL_MS = 60_000
const FAILURE_CACHE_TTL_MS = 15_000
const cache = new Map<string, { expiresAt: number; promise: Promise<unknown> }>()

async function getOrFetch<T>(url: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(url)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise as Promise<T>
  }

  const promise = fetcher()
  cache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS, promise })
  // Shorten (never delete) the cache entry's lifetime on failure — the next
  // caller within the cooldown window gets the same cached rejection
  // instantly, no new network request. Deleting it outright was the bug:
  // it re-armed a fresh, un-throttled retry on every single call.
  promise.catch(() => {
    const entry = cache.get(url)
    if (entry?.promise === promise) {
      entry.expiresAt = Date.now() + FAILURE_CACHE_TTL_MS
    }
  })
  return promise
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw await toApiError(response)
  const body = (await response.json()) as { data: T }
  return body.data
}

/** The backend's own hard max (`public-programs.validator.ts`) — a request above this 400s, it is never silently clamped server-side. */
const MAX_LIMIT = 50

export interface ProgramFilters {
  search?: string
  category?: string
  level?: string
  deliveryMode?: string
  featured?: boolean
  page?: number
  limit?: number
  sort?: string
}

function buildQuery(filters: ProgramFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.category) params.set('category', filters.category)
  if (filters.level) params.set('level', filters.level)
  if (filters.deliveryMode) params.set('deliveryMode', filters.deliveryMode)
  if (filters.featured !== undefined) params.set('featured', String(filters.featured))
  if (filters.page) params.set('page', String(filters.page))
  // Clamp rather than trust a caller-supplied limit too — the client-side
  // guard the backend itself doesn't provide (it 400s instead of clamping).
  const limit = Math.min(filters.limit ?? MAX_LIMIT, MAX_LIMIT)
  params.set('limit', String(limit))
  if (filters.sort) params.set('sort', filters.sort)
  return params.toString()
}

/**
 * The full public catalog (up to `limit`, default 50 — the backend's own
 * max, comfortably above today's ~9 programs) so pages that filter
 * client-side (matching the existing `/programs` filter UX) keep working
 * unchanged; pass explicit filters to push filtering server-side instead
 * (used by `getFeaturedPrograms`).
 */
export async function getPrograms(filters: ProgramFilters = {}): Promise<ProgramListItem[]> {
  const url = `${API_BASE_URL}/public/programs?${buildQuery(filters)}`
  const result = await getOrFetch(url, () => fetchJson<ProgramListItem[]>(url))
  return result
}

export async function getFeaturedPrograms(limit = 6): Promise<ProgramListItem[]> {
  return getPrograms({ featured: true, limit })
}

/** Derived from the full list — no dedicated categories endpoint exists (nor is one needed for a catalog this size). */
export async function getProgramCategories(): Promise<string[]> {
  const programs = await getPrograms()
  return Array.from(new Set(programs.map((program) => program.category)))
}

/**
 * `undefined` for a real 404 (no such published program — the existing
 * "not found" UI branch handles this, matching the old static-data
 * signature); every other failure (network, 5xx, validation) is thrown, so
 * the page's error boundary — not a silent `undefined` — is what catches it.
 */
export async function getProgramBySlug(slug: string): Promise<Program | undefined> {
  const url = `${API_BASE_URL}/public/programs/${slug}`
  try {
    return await getOrFetch(url, () => fetchJson<Program>(url))
  } catch (error) {
    if (error instanceof PublicProgramsApiError && error.status === 404) return undefined
    throw error
  }
}
