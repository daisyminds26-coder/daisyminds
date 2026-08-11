/**
 * Enums genuinely reused across multiple collections. Single-collection
 * enums are declared next to their schema instead — see the "Enum Values"
 * section of each collection in DATABASE.md.
 */

export const CURRENCY_CODES = ['INR', 'USD'] as const
export type CurrencyCode = (typeof CURRENCY_CODES)[number]

export const APPROVAL_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]
