export const PROGRAM_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const
export type ProgramLevel = (typeof PROGRAM_LEVELS)[number]

export const PROGRAM_MODES = ['Online', 'Offline', 'Hybrid'] as const
export type ProgramMode = (typeof PROGRAM_MODES)[number]

/** Card/hero photography — always paired with real, specific alt text (never decorative-empty; these images carry meaning). */
export interface ProgramImage {
  src: string
  alt: string
}

export interface ProgramLearningItem {
  title: string
  description: string
}

export interface ProgramFaqEntry {
  question: string
  answer: string
}

/**
 * Icon names are resolved through `components/marketing/ProgramIcon.tsx`'s
 * lookup map, not imported directly into data — keeps this file JSON-API
 * shaped (serializable, no React component references) so it's a drop-in
 * placeholder for the eventual `GET /api/v1/public/programs` response.
 */
export type ProgramIconName =
  | 'web-development'
  | 'android-development'
  | 'cybersecurity'
  | 'artificial-intelligence'
  | 'data-science'
  | 'data-analytics'
  | 'devops'
  | 'cloud-computing'
  | 'digital-marketing'

/**
 * Shape intentionally mirrors what `GET /api/v1/public/programs` and
 * `GET /api/v1/public/programs/:slug` will eventually return — the
 * marketing data layer in `data/programs.ts` is a drop-in placeholder for
 * that endpoint, not a separate content model. See `data/programs.ts` for
 * the "never fabricate detailed syllabus claims" content rules that shaped
 * `curriculumHighlights`/`tools`/`projects` below.
 */
export interface Program {
  id: string
  slug: string
  title: string
  shortTitle: string
  shortDescription: string
  description: string
  heroImage: ProgramImage
  cardImage: ProgramImage
  icon: ProgramIconName
  category: string
  featured: boolean
  duration: string
  level: ProgramLevel
  learningMode: ProgramMode
  /** Short, punchy proof points shown near the hero (e.g. "Live project-based learning"). */
  highlights: string[]
  /** Short tags shown on the `/services` card (e.g. "React", "Node.js") — not full sentences. */
  skillTags: string[]
  /** "What You Will Learn" — 6–10 cards. */
  whatYouWillLearn: ProgramLearningItem[]
  /** "Curriculum Highlights" — major learning areas, deliberately not exact module/lesson counts. */
  curriculumHighlights: ProgramLearningItem[]
  /** Tools/technologies covered — rendered as plain text badges, never as third-party logos (avoids trademark misuse). */
  tools: string[]
  /** Hands-on projects/practice students work through. */
  projects: ProgramLearningItem[]
  /** Example roles graduates commonly pursue — illustrative, never a guarantee. */
  careerOpportunities: ProgramLearningItem[]
  faq: ProgramFaqEntry[]
  seo: {
    title: string
    description: string
  }
  cta: {
    heading: string
    description: string
  }
  mentorSupport: string
  accent: 'yellow' | 'charcoal' | 'graphite'
  /**
   * Optional mapping-ready pointer to the LMS's real academic `Course`
   * entity (see `docs/DATABASE.md`). Left undefined until an admin links a
   * program to a course — the public site must never write to or duplicate
   * LMS course data, only reference it once linked.
   */
  courseId?: string
}
