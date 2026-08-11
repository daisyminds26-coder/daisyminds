/** Falls back to local dev defaults so `npm run dev` works before a `.env` is created — see `.env.example`. */
export const LMS_URL = import.meta.env.VITE_LMS_URL || 'http://localhost:5173'
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:5174'

export function lmsRoute(path: string): string {
  return `${LMS_URL}${path}`
}
