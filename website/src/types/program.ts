export const PROGRAM_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const
export type ProgramLevel = (typeof PROGRAM_LEVELS)[number]

export const PROGRAM_MODES = ['Online', 'Offline', 'Hybrid'] as const
export type ProgramMode = (typeof PROGRAM_MODES)[number]

export interface ProgramModule {
  title: string
  summary: string
}

/**
 * Shape intentionally mirrors what `GET /api/v1/public/courses` will
 * eventually return — the marketing data layer in `data/programs.ts` is a
 * drop-in placeholder for that endpoint, not a separate content model.
 */
export interface Program {
  slug: string
  title: string
  category: string
  level: ProgramLevel
  mode: ProgramMode
  durationLabel: string
  outcome: string
  summary: string
  description: string
  skills: string[]
  modules: ProgramModule[]
  mentorSupport: string
  accent: 'yellow' | 'charcoal' | 'graphite'
}
