/**
 * Real backend enum values (`backend/src/models/course.model.ts`) — kept
 * as-is rather than remapped to a website-only vocabulary, so a value
 * straight off the API never needs translation before being compared/typed
 * against. Display casing is handled by `formatEnumLabel` where rendered.
 */
export const PROGRAM_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'] as const
export type ProgramLevel = (typeof PROGRAM_LEVELS)[number]

export const PROGRAM_DELIVERY_MODES = ['ONLINE', 'OFFLINE', 'HYBRID', 'SELF_PACED'] as const
export type ProgramDeliveryMode = (typeof PROGRAM_DELIVERY_MODES)[number]

export const BATCH_AVAILABILITY = ['AVAILABLE', 'LIMITED', 'FULL'] as const
export type BatchAvailability = (typeof BATCH_AVAILABILITY)[number]

export interface ProgramLesson {
  id: string
  title: string
  lessonType: string
  estimatedDurationMinutes: number | null
}

export interface ProgramModule {
  id: string
  title: string
  description: string
  lessons: ProgramLesson[]
}

export interface ProgramUpcomingBatch {
  id: string
  batchCode: string
  name: string
  startDate: string | null
  endDate: string | null
  deliveryMode: ProgramDeliveryMode
  timezone: string
  weeklyScheduleSummary: string[]
  availability: BatchAvailability
}

/**
 * Mirrors `backend/src/services/public-programs-dto.ts`'s
 * `PublicProgramListItemDto` field-for-field — this is a direct API
 * response shape, not a website content model. Fields the old static
 * `data/programs.ts` had that Course Management doesn't (FAQ, career
 * opportunities, tools, projects, mentor-support copy, curriculum
 * "highlights") are gone, not faked; `courseMarketing` fields can be added
 * here additively if a later phase ships them on the backend.
 */
export interface ProgramListItem {
  id: string
  courseCode: string
  slug: string
  title: string
  shortDescription: string
  thumbnailUrl: string | null
  category: string
  level: ProgramLevel
  deliveryMode: ProgramDeliveryMode
  duration: string | null
  skills: string[]
  certificateAvailable: boolean
  featured: boolean
  featuredOrder: number | null
}

/** Mirrors `PublicProgramDetailDto` — superset of `ProgramListItem`. */
export interface Program extends ProgramListItem {
  description: string
  bannerUrl: string | null
  language: string
  durationValue: number | null
  durationUnit: string | null
  learningOutcomes: string[]
  seo: { title: string; description: string }
  publishedAt: string | null
  curriculum: ProgramModule[]
  upcomingBatches: ProgramUpcomingBatch[]
}

/** `"BEGINNER"` -> `"Beginner"`, `"ALL_LEVELS"` -> `"All Levels"`, `"SELF_PACED"` -> `"Self Paced"`. */
export function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}
