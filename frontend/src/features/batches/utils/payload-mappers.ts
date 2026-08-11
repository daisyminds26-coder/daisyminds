import { format } from 'date-fns'

import type {
  CalendarExceptionInput,
  LocationInput,
  WeeklyScheduleSlotInput,
} from '@/features/batches/api/batches.api'
import type {
  CalendarExceptionFormValues,
  WeeklyScheduleSlotFormValues,
} from '@/features/batches/schemas/batch.schemas'

/**
 * Shared request-payload mappers used by both `BatchCreateWizard` (full
 * create payload) and `BatchDetailPage` (per-tab partial-update payloads) —
 * kept in one place so the "empty string vs `undefined`" and "`Date` vs
 * `yyyy-MM-dd` string" conversions never drift between the two call sites.
 */
export function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed === '' ? undefined : trimmed
}

export function toNumberOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function toLocationPayload(
  location: Partial<LocationInput> | undefined,
): LocationInput | undefined {
  if (!location) return undefined
  const cleaned: LocationInput = {
    meetingProvider: location.meetingProvider,
    virtualClassNotes: emptyToUndefined(location.virtualClassNotes),
    venueName: emptyToUndefined(location.venueName),
    addressLine1: emptyToUndefined(location.addressLine1),
    addressLine2: emptyToUndefined(location.addressLine2),
    city: emptyToUndefined(location.city),
    state: emptyToUndefined(location.state),
    postalCode: emptyToUndefined(location.postalCode),
    country: emptyToUndefined(location.country),
    room: emptyToUndefined(location.room),
    mapUrl: emptyToUndefined(location.mapUrl),
  }
  const hasAnyValue = Object.values(cleaned).some((value) => value !== undefined)
  return hasAnyValue ? cleaned : undefined
}

export function toWeeklySchedulePayload(
  slots: WeeklyScheduleSlotFormValues[] | undefined,
): WeeklyScheduleSlotInput[] {
  return (slots ?? []).map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    sessionLabel: emptyToUndefined(slot.sessionLabel),
    locationOverride: emptyToUndefined(slot.locationOverride),
    deliveryModeOverride: slot.deliveryModeOverride,
  }))
}

export function toCalendarExceptionsPayload(
  exceptions: CalendarExceptionFormValues[] | undefined,
): CalendarExceptionInput[] {
  return (exceptions ?? []).map((exception) => ({
    date: format(exception.date, 'yyyy-MM-dd'),
    type: exception.type,
    title: exception.title,
    note: emptyToUndefined(exception.note),
  }))
}
