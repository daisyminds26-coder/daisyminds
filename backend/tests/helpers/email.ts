import type { Mock } from 'vitest'

/** Pulls the `?token=` query param from the `link` argument of a mocked `enqueueAuthEmail` call. */
export function extractTokenFromEmailLink(mockFn: Mock, callIndex = 0): string {
  const call = mockFn.mock.calls[callIndex] as [unknown, { link: string }] | undefined
  const link = call?.[1].link

  if (!link) {
    throw new Error('Expected enqueueAuthEmail to have been called with a link')
  }

  const token = new URL(link).searchParams.get('token')
  if (!token) {
    throw new Error('Expected the email link to include a token query param')
  }

  return token
}
