import { useEffect, useRef } from 'react'

import { refresh } from '@/features/auth/api/auth.api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { isApiClientError } from '@/shared/lib/api-error'

const RETRYABLE_BOOTSTRAP_DELAYS_MS = [1000, 3000, 8000]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * The one error worth retrying: a rate-limited refresh means nothing about
 * whether the session is valid, only that this particular check got
 * throttled — a data-heavy admin SPA with a few tabs open can legitimately
 * burn through a shared request budget. Everything else (401 = genuinely no
 * session, a network error, a 5xx) keeps its existing immediate-resolve
 * behavior — those already have deliberate, tested contracts (a network
 * failure is "genuinely unexpected" and should surface promptly, not hang
 * behind a multi-second retry loop on every real outage).
 */
function isRetryableBootstrapError(error: unknown): boolean {
  return isApiClientError(error) && error.statusCode === 429
}

/**
 * Runs once at app startup: attempts `/auth/refresh` against the httpOnly
 * session cookie (if any). A valid cookie restores the session without the
 * user re-entering credentials; no cookie (or an invalid/expired one) is a
 * normal, expected 401 — not an error to surface. `RequireAuth`/`RequireGuest`
 * both gate on `status === 'loading'` so nothing renders (protected content
 * or the login form) until this resolves either way.
 *
 * `hasStarted` is a ref, not state, specifically so it survives React
 * StrictMode's dev-only mount→cleanup→remount effect double-invocation
 * without starting a second bootstrap call. It must NOT be combined with a
 * per-invocation "cancelled" flag checked after the awaited call resolves —
 * that combination was the actual bug here: StrictMode's first cleanup set
 * `cancelled = true` on the one and only bootstrap call that will ever run
 * (the second effect invocation short-circuits on `hasStarted.current`), so
 * the in-flight promise's result was silently discarded and `status` never
 * left `'loading'`. `setAccessToken`/`setStatus` are Zustand actions, not
 * React `setState` — they carry no "component still mounted" requirement,
 * so there is nothing to protect by cancelling this call in the first
 * place; letting it always run to completion is the fix.
 */
export function useAuthBootstrap(): void {
  const setAccessToken = useAuthStore((state) => state.setAccessToken)
  const setStatus = useAuthStore((state) => state.setStatus)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    async function attemptRefresh(): Promise<boolean> {
      try {
        const result = await refresh()
        setAccessToken(result.accessToken)
        setStatus('authenticated')
        return true
      } catch (error) {
        if (isRetryableBootstrapError(error)) return false

        if (!isApiClientError(error) || error.statusCode !== 401) {
          console.error('Unexpected error during authentication bootstrap', error)
        }
        setAccessToken(null)
        setStatus('unauthenticated')
        return true
      }
    }

    async function bootstrap() {
      if (await attemptRefresh()) return

      for (const retryDelay of RETRYABLE_BOOTSTRAP_DELAYS_MS) {
        await delay(retryDelay)
        if (await attemptRefresh()) return
      }

      // Every retry was still rate-limited — fail open to "unauthenticated"
      // (show the login screen) rather than hang on `status: 'loading'`
      // forever. The user can still just log in normally; a genuinely valid
      // session isn't destroyed by this, since nothing here revokes it
      // server-side.
      setAccessToken(null)
      setStatus('unauthenticated')
    }

    void bootstrap()
  }, [setAccessToken, setStatus])
}
