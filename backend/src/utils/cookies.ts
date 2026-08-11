import type { CookieOptions, Response } from 'express'

import { env } from '../config/env'

const REFRESH_COOKIE_PATH = `${env.API_PREFIX}/auth`

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  }
}

/** `sessionId.rawToken` — see token.service.ts for why the token isn't a bare opaque string. */
export function setRefreshCookie(res: Response, cookieValue: string, expiresAt: Date): void {
  res.cookie(env.REFRESH_COOKIE_NAME, cookieValue, {
    ...baseCookieOptions(),
    expires: expiresAt,
  })
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.REFRESH_COOKIE_NAME, baseCookieOptions())
}
