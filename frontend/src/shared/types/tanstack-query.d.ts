import '@tanstack/react-query'

import type { ApiClientError } from '@/shared/lib/api-error'

/**
 * Every `apiClient` rejection is an `ApiClientError` (shared/lib/api-client.ts's
 * interceptor guarantees this) — this makes that the default error type
 * across every `useQuery`/`useMutation` in the app instead of requiring
 * `useMutation<T, ApiClientError>(...)` boilerplate at every call site.
 */
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiClientError
  }
}
