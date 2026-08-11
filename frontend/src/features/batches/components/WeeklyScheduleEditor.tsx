import { useMemo } from 'react'
import { useFieldArray, useWatch, type Control, type FieldValues } from 'react-hook-form'
import { AlertTriangle, CalendarClock, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { TextField } from '@/shared/components/forms/text-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { BATCH_DELIVERY_MODES, DAYS_OF_WEEK, type DayOfWeek } from '@/features/batches/types'
import type { WeeklyScheduleSlotFormValues } from '@/features/batches/schemas/batch.schemas'

/**
 * `restrict-template-expressions` disallows a bare `number` inside a
 * template literal; centralizing the one interpolation here (with a single
 * justified disable) keeps every call site below lint-clean. The `as never`
 * cast is necessary because `TFieldValues` here is a generic constrained by
 * shape, not a concrete form-values type RHF's `FieldPath<T>` can resolve a
 * dynamic per-row path against — same tradeoff as
 * `features/trainers/components/AvailabilityEditor.tsx`'s `slotField`.
 */
function slotField(index: number, key: keyof WeeklyScheduleSlotFormValues): never {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `weeklySchedule.${index}.${key}` as never
}

function minutesOf(time: string | undefined): number | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null
  const [hoursText, minutesText] = time.split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText)
  return hours * 60 + minutes
}

function findOverlappingSlotIndexes(slots: WeeklyScheduleSlotFormValues[]): Set<number> {
  const overlapping = new Set<number>()
  const byDay = new Map<DayOfWeek, number[]>()

  slots.forEach((slot, index) => {
    const indexes = byDay.get(slot.dayOfWeek) ?? []
    indexes.push(index)
    byDay.set(slot.dayOfWeek, indexes)
  })

  for (const indexes of byDay.values()) {
    for (let a = 0; a < indexes.length; a += 1) {
      for (let b = a + 1; b < indexes.length; b += 1) {
        const indexA = indexes[a]
        const indexB = indexes[b]
        const first = indexA === undefined ? undefined : slots[indexA]
        const second = indexB === undefined ? undefined : slots[indexB]
        if (indexA === undefined || indexB === undefined || !first || !second) continue
        const firstStart = minutesOf(first.startTime)
        const firstEnd = minutesOf(first.endTime)
        const secondStart = minutesOf(second.startTime)
        const secondEnd = minutesOf(second.endTime)
        if (firstStart === null || firstEnd === null || secondStart === null || secondEnd === null)
          continue
        if (firstStart < secondEnd && secondStart < firstEnd) {
          overlapping.add(indexA)
          overlapping.add(indexB)
        }
      }
    }
  }

  return overlapping
}

function totalWeeklyMinutes(slots: WeeklyScheduleSlotFormValues[]): number {
  return slots.reduce((total, slot) => {
    const start = minutesOf(slot.startTime)
    const end = minutesOf(slot.endTime)
    if (start === null || end === null || end <= start) return total
    return total + (end - start)
  }, 0)
}

function formatHours(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) return `${hours.toString()}h`
  return `${hours.toString()}h ${minutes.toString()}m`
}

const DEFAULT_SLOT: WeeklyScheduleSlotFormValues = {
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '11:00',
  sessionLabel: '',
  locationOverride: '',
  deliveryModeOverride: undefined,
}

/**
 * Recurring weekly timetable editor — deliberately NOT a calendar UI (each
 * row is a recurring day/time template, not a real class session). Overlap
 * detection here is a same-day, visual-only warning; the backend re-checks
 * on save and remains authoritative (`batch.schemas.ts`'s documented
 * no-cross-field-refine constraint). No drag-and-drop: reordering isn't a
 * meaningful operation for a set of independent weekly slots, so only
 * add/remove is supported, entirely through native, keyboard-operable form
 * controls.
 */
export function WeeklyScheduleEditor<
  TFieldValues extends FieldValues & { weeklySchedule?: WeeklyScheduleSlotFormValues[] },
>({ control }: { control: Control<TFieldValues> }) {
  const fieldArray = useFieldArray({ control, name: 'weeklySchedule' as never })
  const watchedSlotsRaw = useWatch({ control, name: 'weeklySchedule' as never }) as
    WeeklyScheduleSlotFormValues[] | undefined

  const overlappingIndexes = useMemo(
    () => findOverlappingSlotIndexes(watchedSlotsRaw ?? []),
    [watchedSlotsRaw],
  )
  const totalMinutes = useMemo(() => totalWeeklyMinutes(watchedSlotsRaw ?? []), [watchedSlotsRaw])

  return (
    <div className="flex flex-col gap-4">
      {fieldArray.fields.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No weekly sessions scheduled"
          description="Add a recurring day/time slot this batch meets — e.g. Monday 09:00–11:00."
        />
      ) : (
        <>
          <p className="text-body-sm text-muted-foreground">
            Total weekly session time:{' '}
            <span className="font-medium">{formatHours(totalMinutes)}</span>
          </p>
          <ul data-testid="weekly-schedule-rows" className="grid grid-cols-1 gap-3">
            {fieldArray.fields.map((field, index) => (
              <li
                key={field.id}
                className="border-border flex flex-col gap-3 rounded-lg border p-4"
              >
                {overlappingIndexes.has(index) && (
                  <div className="text-warning flex items-center gap-1.5 text-xs font-medium">
                    <AlertTriangle className="size-3.5" aria-hidden="true" />
                    This slot overlaps another slot on the same day
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <SelectField
                    control={control}
                    name={slotField(index, 'dayOfWeek')}
                    label="Day"
                    options={DAYS_OF_WEEK.map((day) => ({
                      value: day,
                      label: day.charAt(0) + day.slice(1).toLowerCase(),
                    }))}
                  />
                  <TextField
                    control={control}
                    name={slotField(index, 'startTime')}
                    label="Start time"
                    type="time"
                  />
                  <TextField
                    control={control}
                    name={slotField(index, 'endTime')}
                    label="End time"
                    type="time"
                  />
                  <TextField
                    control={control}
                    name={slotField(index, 'sessionLabel')}
                    label="Session label"
                    placeholder="Optional"
                  />
                  <TextField
                    control={control}
                    name={slotField(index, 'locationOverride')}
                    label="Location override"
                    placeholder="Optional"
                  />
                  <SelectField
                    control={control}
                    name={slotField(index, 'deliveryModeOverride')}
                    label="Delivery override"
                    placeholder="Same as batch"
                    options={BATCH_DELIVERY_MODES.map((mode) => ({ value: mode, label: mode }))}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive self-start"
                  onClick={() => {
                    fieldArray.remove(index)
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Remove slot
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={() => {
          fieldArray.append(DEFAULT_SLOT as never)
        }}
      >
        <Plus className="size-3.5" />
        Add slot
      </Button>
    </div>
  )
}
