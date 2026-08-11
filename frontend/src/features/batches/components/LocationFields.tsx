import { useWatch, type Control, type FieldValues } from 'react-hook-form'

import { TextField } from '@/shared/components/forms/text-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { MEETING_PROVIDERS, type BatchDeliveryMode } from '@/features/batches/types'
import type { LocationInput } from '@/features/batches/api/batches.api'

/** See `WeeklyScheduleEditor.tsx`'s `slotField` comment for why this cast/helper is necessary — same generic-constraint tradeoff, just without a numeric array index. */
function locationField(key: keyof LocationInput): never {
  return `location.${key}` as never
}

/**
 * Mode-aware location sub-form: reads the sibling `deliveryMode` field's
 * live value via `useWatch` and conditionally renders ONLINE fields
 * (meeting provider + notes), OFFLINE fields (full venue address), or both
 * for HYBRID — mirrors the backend's own mode-aware `BatchLocation` shape
 * (`features/batches/types/index.ts`).
 */
export function LocationFields<
  TFieldValues extends FieldValues & { deliveryMode: BatchDeliveryMode; location?: LocationInput },
>({ control }: { control: Control<TFieldValues> }) {
  const deliveryMode = useWatch({ control, name: 'deliveryMode' as never }) as unknown as
    BatchDeliveryMode | undefined

  const showOnline = deliveryMode === 'ONLINE' || deliveryMode === 'HYBRID'
  const showOffline = deliveryMode === 'OFFLINE' || deliveryMode === 'HYBRID'

  return (
    <div className="flex flex-col gap-4">
      {showOnline && (
        <div className="flex flex-col gap-4">
          <p className="text-body-sm font-medium">Virtual classroom</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              control={control}
              name={locationField('meetingProvider')}
              label="Meeting provider"
              options={MEETING_PROVIDERS.map((provider) => ({
                value: provider,
                label: provider.replace(/_/g, ' '),
              }))}
            />
          </div>
          <TextField
            control={control}
            name={locationField('virtualClassNotes')}
            label="Virtual class notes"
            placeholder="Meeting link, access instructions, etc."
          />
        </div>
      )}

      {showOffline && (
        <div className="flex flex-col gap-4">
          <p className="text-body-sm font-medium">Venue</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField control={control} name={locationField('venueName')} label="Venue name" />
            <TextField control={control} name={locationField('room')} label="Room" />
            <TextField
              control={control}
              name={locationField('addressLine1')}
              label="Address line 1"
            />
            <TextField
              control={control}
              name={locationField('addressLine2')}
              label="Address line 2"
            />
            <TextField control={control} name={locationField('city')} label="City" />
            <TextField control={control} name={locationField('state')} label="State" />
            <TextField control={control} name={locationField('postalCode')} label="Postal code" />
            <TextField control={control} name={locationField('country')} label="Country" />
          </div>
          <TextField
            control={control}
            name={locationField('mapUrl')}
            label="Map URL"
            placeholder="https://…"
          />
        </div>
      )}

      {!deliveryMode && (
        <p className="text-body-sm text-muted-foreground">
          Select a delivery mode to configure its location details.
        </p>
      )}
    </div>
  )
}
