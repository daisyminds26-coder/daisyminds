import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Calendar } from '@/shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { cn } from '@/shared/lib/utils'
import { DASHBOARD_RANGES, type DashboardRange } from '@/features/dashboard/types'

const RANGE_LABELS: Record<DashboardRange, string> = {
  TODAY: 'Today',
  LAST_7_DAYS: 'Last 7 days',
  LAST_30_DAYS: 'Last 30 days',
  THIS_MONTH: 'This month',
  THIS_YEAR: 'This year',
  CUSTOM: 'Custom range',
}

interface PeriodSelectorProps {
  range: DashboardRange
  onRangeChange: (range: DashboardRange) => void
  customStart: Date | undefined
  customEnd: Date | undefined
  onCustomStartChange: (date: Date | undefined) => void
  onCustomEndChange: (date: Date | undefined) => void
  customRangeError?: string
}

export function PeriodSelector({
  range,
  onRangeChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  customRangeError,
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Select
        value={range}
        onValueChange={(value) => {
          onRangeChange(value as DashboardRange)
        }}
      >
        <SelectTrigger aria-label="Dashboard period" className="w-auto min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DASHBOARD_RANGES.map((value) => (
            <SelectItem key={value} value={value}>
              {RANGE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {range === 'CUSTOM' && (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <DatePopoverButton
              label="Start date"
              value={customStart}
              onChange={onCustomStartChange}
            />
            <DatePopoverButton
              label="End date"
              value={customEnd}
              onChange={onCustomEndChange}
              fromDate={customStart}
            />
          </div>
          {customRangeError && <p className="text-caption text-destructive">{customRangeError}</p>}
        </div>
      )}
    </div>
  )
}

function DatePopoverButton({
  label,
  value,
  onChange,
  fromDate,
}: {
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  fromDate?: Date
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={label}
          className={cn('gap-2 font-normal', !value && 'text-muted-foreground')}
        >
          <CalendarIcon className="size-3.5" />
          {value ? format(value, 'PP') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={value}
          onSelect={onChange}
          startMonth={fromDate}
          disabled={fromDate ? [{ before: fromDate }] : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}
