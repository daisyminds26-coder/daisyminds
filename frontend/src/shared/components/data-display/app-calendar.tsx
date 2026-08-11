import { Calendar } from '@/shared/components/ui/calendar'
import { Card, CardContent } from '@/shared/components/ui/card'

interface AppCalendarProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
}

/** Pre-themed standalone calendar (e.g. a batch schedule widget) — card-wrapped single-date picker. */
export function AppCalendar({ selected, onSelect, className }: AppCalendarProps) {
  return (
    <Card className={className}>
      <CardContent className="flex justify-center p-2">
        <Calendar mode="single" selected={selected} onSelect={onSelect} className="p-0" />
      </CardContent>
    </Card>
  )
}
