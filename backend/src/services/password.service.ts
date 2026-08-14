import { Algorithm, hash, verify, type Options } from '@node-rs/argon2'

/**
 * Argon2id per OWASP's current password-hashing guidance (SECURITY.md §2) —
 * these parameters are OWASP's documented baseline, not arbitrary tuning.
 * Password *policy* (length/character-class rules) lives in
 * `validators/auth.validator.ts` as a Zod schema, not here — this service's
 * only job is hashing/verifying, consistent with CODING-STANDARDS.md's split
 * between validation (middleware) and business logic (services).
 *
 * Uses `@node-rs/argon2` (napi-rs, prebuilt per-platform binaries) rather
 * than the `argon2` package (node-gyp/node-addon-api) — the latter has no
 * prebuild for some shared-hosting Node builds (e.g. CloudLinux's
 * alt-nodejs) and falls back to compiling from source, which fails there
 * without a modern Python/toolchain. Same algorithm and parameters either way.
 */
const ARGON2_OPTIONS: Options = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
}

export function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, ARGON2_OPTIONS)
}

export function verifyPassword(hashed: string, plainPassword: string): Promise<boolean> {
  return verify(hashed, plainPassword)
}
