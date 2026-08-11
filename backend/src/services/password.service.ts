import argon2, { type HashOptions } from 'argon2'

/**
 * Argon2id per OWASP's current password-hashing guidance (SECURITY.md §2) —
 * these parameters are OWASP's documented baseline, not arbitrary tuning.
 * Password *policy* (length/character-class rules) lives in
 * `validators/auth.validator.ts` as a Zod schema, not here — this service's
 * only job is hashing/verifying, consistent with CODING-STANDARDS.md's split
 * between validation (middleware) and business logic (services).
 */
const ARGON2_OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
}

export function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, ARGON2_OPTIONS)
}

export function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
  return argon2.verify(hash, plainPassword)
}
