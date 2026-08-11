/**
 * Matches `api-client.ts`'s fallback default so tests never depend on a
 * `.env`/`.env.test` file existing. MSW handlers below build their request
 * matchers from this same constant, so the two can't drift apart.
 */
export const TEST_API_BASE_URL = 'http://localhost:3000/api/v1'
