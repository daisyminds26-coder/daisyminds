import type { UpcomingBatch } from '@/types/batch'

/** Placeholder for `GET /api/v1/public/batches` — dates are computed relative to today at module load so this never silently drifts into the past like a hardcoded date would. */
function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const UPCOMING_BATCHES: UpcomingBatch[] = [
  {
    id: 'batch-1',
    programSlug: 'full-stack-web-development',
    programTitle: 'Full Stack Web Development',
    startDate: daysFromNow(18),
    mode: 'Hybrid',
    timeSlot: 'Mon–Fri, 7:00–9:00 PM IST',
    seatsRemaining: 6,
  },
  {
    id: 'batch-2',
    programSlug: 'data-science-analytics',
    programTitle: 'Data Science & Analytics',
    startDate: daysFromNow(25),
    mode: 'Online',
    timeSlot: 'Tue/Thu/Sat, 6:00–8:00 PM IST',
    seatsRemaining: 4,
  },
  {
    id: 'batch-3',
    programSlug: 'ui-ux-product-design',
    programTitle: 'UI/UX Product Design',
    startDate: daysFromNow(32),
    mode: 'Hybrid',
    timeSlot: 'Weekends, 10:00 AM–1:00 PM IST',
    seatsRemaining: 8,
  },
  {
    id: 'batch-4',
    programSlug: 'cloud-devops-engineering',
    programTitle: 'Cloud & DevOps Engineering',
    startDate: daysFromNow(40),
    mode: 'Online',
    timeSlot: 'Mon/Wed/Fri, 8:00–10:00 PM IST',
    seatsRemaining: 5,
  },
]

export async function getUpcomingBatches(): Promise<UpcomingBatch[]> {
  return Promise.resolve(UPCOMING_BATCHES)
}
