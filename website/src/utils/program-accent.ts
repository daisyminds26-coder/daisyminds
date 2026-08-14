export type ProgramAccent = 'yellow' | 'charcoal' | 'graphite'

const ACCENTS: ProgramAccent[] = ['yellow', 'charcoal', 'graphite']

/**
 * Course Management has no accent-color field — purely cosmetic, so it's
 * derived client-side rather than inventing a backend field. Deterministic
 * per category (same category always renders the same accent, category to
 * category still varies), not random per render.
 */
export function programAccent(category: string): ProgramAccent {
  let hash = 0
  for (let i = 0; i < category.length; i += 1) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0
  }
  return ACCENTS[hash % ACCENTS.length] ?? 'yellow'
}
