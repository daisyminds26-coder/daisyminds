/**
 * Deliberately NOT `Intl.supportedValuesOf('timeZone').includes(value)` —
 * that list is ICU's *canonical* names, which for some zones is the legacy
 * IANA alias rather than the modern one (e.g. it contains `Asia/Calcutta`
 * but not the now-preferred `Asia/Kolkata`, even though both are valid,
 * currently-correct IANA identifiers). Constructing `Intl.DateTimeFormat`
 * with the candidate zone is the standard, alias-tolerant way to validate a
 * timezone string — it throws `RangeError` only for genuinely unrecognized
 * input. Extracted from `trainer.validator.ts` (Phase 7) so the dashboard
 * module's own timezone-aware date-range logic (Phase 8) shares the exact
 * same check instead of a second copy.
 */
export function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value })
    return true
  } catch {
    return false
  }
}
