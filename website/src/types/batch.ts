/**
 * Static homepage teaser content (`data/batches.ts`) — a separate, still-
 * static concept from `Program.upcomingBatches` (the real, per-program
 * batch data now sourced from `GET /api/v1/public/programs/:slug`, see
 * `types/program.ts#ProgramUpcomingBatch`). Not migrated as part of the
 * training-programs dynamic-data work.
 */
export type BatchMode = 'Online' | 'Offline' | 'Hybrid'

/** Mirrors the eventual `GET /api/v1/public/batches` shape — a read-only, non-sensitive projection of the LMS's own batch scheduling data. */
export interface UpcomingBatch {
  id: string
  programSlug: string
  programTitle: string
  startDate: string
  mode: BatchMode
  timeSlot: string
  seatsRemaining: number
}
