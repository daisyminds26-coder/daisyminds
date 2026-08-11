/** Mirrors the eventual `GET /api/v1/public/trainers` shape — a deliberately small, public-safe subset of the LMS's own trainer profile fields. */
export interface Trainer {
  slug: string
  name: string
  role: string
  expertise: string[]
  bio: string
  initials: string
}
