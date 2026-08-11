import { useFieldArray, type Control, type FieldValues } from 'react-hook-form'
import { CalendarClock, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { TextField } from '@/shared/components/forms/text-field'
import { SelectField } from '@/shared/components/forms/select-field'
import {
  AVAILABILITY_SLOT_TYPES,
  DAYS_OF_WEEK,
  type AvailabilitySlotType,
  type DayOfWeek,
} from '@/features/trainers/types'

export interface AvailabilitySlotFormValue {
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  timeZone: string
  type: AvailabilitySlotType
}

const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * `restrict-template-expressions` disallows a bare `number` inside a
 * template literal; centralizing the one interpolation here (with a single
 * justified disable) keeps every call site below lint-clean. The `as never`
 * cast is necessary because `TFieldValues` here is a generic constrained by
 * shape, not a concrete form-values type RHF's `FieldPath<T>` can resolve a
 * dynamic per-row path against.
 */
function slotField(index: number, key: keyof AvailabilitySlotFormValue): never {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `availability.${index}.${key}` as never
}

/**
 * A structured weekly-recurring schedule editor — deliberately NOT a
 * calendar UI (Phase 7 spec: "do not implement live calendar scheduling
 * yet"). Each row is one recurring slot (day + time range + type); overlap
 * validation happens in the shared Zod schema (`trainer.schemas.ts`) on
 * submit, surfaced here as a normal field-level error under the row.
 *
 * Constrained to `TFieldValues` that actually have an `availability` array
 * of this shape — both the create wizard and edit form's schemas share the
 * same base (`trainerProfileSchema`), so this one component serves both.
 * The per-row field names below are built from a numeric array index, which
 * RHF's `FieldPath<T>` type can't express for an unconstrained generic
 * `TFieldValues` without a cast — narrowly scoped to this file, same
 * tradeoff as `emergencyContactField`/`educationRecordField` in the
 * students module, just without a named helper since every field here
 * needs it.
 */
export function AvailabilityEditor<
  TFieldValues extends FieldValues & { availability: AvailabilitySlotFormValue[] },
>({ control }: { control: Control<TFieldValues> }) {
  const fieldArray = useFieldArray({ control, name: 'availability' as never })

  return (
    <div className="flex flex-col gap-4">
      {fieldArray.fields.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No weekly availability set"
          description="Add a recurring day/time slot the trainer is available, preferred, or blocked."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {fieldArray.fields.map((field, index) => (
            <li key={field.id} className="border-border flex flex-col gap-3 rounded-lg border p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
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
                  placeholder="09:00"
                />
                <TextField
                  control={control}
                  name={slotField(index, 'endTime')}
                  label="End time"
                  placeholder="11:00"
                />
                <TextField
                  control={control}
                  name={slotField(index, 'timeZone')}
                  label="Time zone"
                  placeholder={BROWSER_TIME_ZONE}
                />
                <SelectField
                  control={control}
                  name={slotField(index, 'type')}
                  label="Type"
                  options={AVAILABILITY_SLOT_TYPES.map((type) => ({
                    value: type,
                    label: type.charAt(0) + type.slice(1).toLowerCase(),
                  }))}
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
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={() => {
          fieldArray.append({
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '11:00',
            timeZone: BROWSER_TIME_ZONE,
            type: 'AVAILABLE',
          } as never)
        }}
      >
        <Plus className="size-3.5" />
        Add availability slot
      </Button>
    </div>
  )
}
