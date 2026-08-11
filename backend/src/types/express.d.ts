import type { AuthenticatedUser } from './auth'

export interface ValidatedRequestData {
  body?: unknown
  query?: unknown
  params?: unknown
}

declare global {
  namespace Express {
    interface Request {
      /** Correlation ID for this request — set by request-id.middleware.ts. */
      requestId: string
      /**
       * Parsed/coerced output of the route's Zod schema(s), set by
       * validate.middleware.ts. Controllers read from here, never from raw
       * `req.body`/`req.query`/`req.params` (API-STANDARDS.md §5).
       */
      validated?: ValidatedRequestData
      /** Decoded access-token payload, set by require-auth.middleware.ts. */
      user?: AuthenticatedUser
      /** Resource loaded and ownership-verified by ownership.middleware.ts. */
      ownedResource?: unknown
    }
  }
}

export {}
