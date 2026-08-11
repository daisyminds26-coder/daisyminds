import type { ProgramMode } from '@/types/program'

/** Mirrors the eventual `GET /api/v1/public/batches` shape — a read-only, non-sensitive projection of the LMS's own batch scheduling data. */
export interface UpcomingBatch {
  id: string
  programSlug: string
  programTitle: string
  startDate: string
  mode: ProgramMode
  timeSlot: string
  seatsRemaining: number
}
