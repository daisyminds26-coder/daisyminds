import type { Request } from 'express'
import { ipKeyGenerator } from 'express-rate-limit'

import { verifyAccessToken } from '../services/token.service'

const BEARER_PREFIX = 'Bearer '

/**
 * Rate-limit key for authenticated traffic: the user's own id when a valid
 * access token is present, IP address otherwise (via express-rate-limit's
 * own `ipKeyGenerator`, which normalizes IPv6 addresses safely — a bare
 * `req.ip` in a custom keyGenerator would let an IPv6 client bypass limits
 * by varying the low bits of its address).
 *
 * Keying by user rather than raw IP matters specifically for this app's
 * real deployment shape: a batch of students in the same classroom/training
 * center, or an office behind one router, all share one public IP. An
 * IP-keyed limiter would let them throttle each other's genuinely
 * independent usage; user-keying means each account draws from its own
 * budget regardless of how many other people share its network.
 *
 * Deliberately does not fail loudly on an invalid/expired/missing token —
 * this runs ahead of `requireAuth` (the global limiter is mounted before
 * any router), so an unauthenticated or not-yet-authenticated request is
 * completely normal here, not an error. `requireAuth` remains the actual
 * authorization gate; this only ever affects which rate-limit bucket a
 * request draws from.
 */
export function userOrIpKeyGenerator(req: Request): string {
  const header = req.headers.authorization
  if (header?.startsWith(BEARER_PREFIX)) {
    try {
      const user = verifyAccessToken(header.slice(BEARER_PREFIX.length).trim())
      return `user:${user.id}`
    } catch {
      // Falls through to IP — an invalid/expired token here just means "not
      // authenticated yet," which `requireAuth` will separately reject on
      // routes that actually require it.
    }
  }
  return ipKeyGenerator(req.ip ?? '')
}
