import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** `PREFER_NOT_TO_SAY` -> `Prefer not to say` — for displaying a SCREAMING_CASE enum value as a normal label. */
export function formatEnumLabel(value: string): string {
  const spaced = value.toLowerCase().replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
