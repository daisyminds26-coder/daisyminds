/** Falls back to local dev defaults so `npm run dev` works before a `.env` is created — see `.env.example`. */
export const LMS_URL = import.meta.env.VITE_LMS_URL || 'http://localhost:5173'
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:5174'
/** Backend LMS API base — used only by `services/auth-service.ts` for the `/apply` flow's real login call. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

export function lmsRoute(path: string): string {
  return `${LMS_URL}${path}`
}
