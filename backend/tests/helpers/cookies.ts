import type { Response as SupertestResponse } from 'supertest'

/** Extracts the `name=value` pair for a cookie from a supertest response's Set-Cookie header. */
export function extractCookie(res: SupertestResponse, cookieName: string): string {
  const setCookieHeader = res.headers['set-cookie'] as unknown as string[] | undefined
  const fullCookie = setCookieHeader?.find((cookie) => cookie.startsWith(`${cookieName}=`))
  const nameValuePair = fullCookie?.split(';')[0]

  if (!nameValuePair) {
    throw new Error(`Expected a "${cookieName}" cookie in the response, found none`)
  }

  return nameValuePair
}
