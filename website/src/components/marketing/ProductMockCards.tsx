import type { ReactNode } from 'react'
import { BookOpen, Calendar, CheckCircle2, FileText, PlayCircle } from 'lucide-react'

import { cn } from '@/utils/cn'

/**
 * Illustrative Daisy Minds LMS product mockups used only in marketing
 * compositions (the hero, the product-showcase section) — built from
 * layout primitives, never a real screenshot, so they stay accurate to the
 * brand system regardless of what the authenticated app looks like on any
 * given day.
 */
function MockCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'shadow-lifted border-border-soft w-64 rounded-2xl border bg-white p-4 text-left',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function MyLearningMockCard({ className }: { className?: string }) {
  return (
    <MockCard className={className}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-ink-soft text-[11px] font-semibold tracking-wide uppercase">
          My Learning
        </span>
        <BookOpen className="text-primary-dark size-4" aria-hidden="true" />
      </div>
      <p className="text-ink text-sm font-bold">Full Stack Web Development</p>
      <div className="bg-surface-raised mt-3 h-2 w-full overflow-hidden rounded-full">
        <div className="bg-primary h-full w-[68%] rounded-full" />
      </div>
      <p className="text-ink-soft mt-1.5 text-xs">68% complete · Module 5 of 8</p>
    </MockCard>
  )
}

export function CurriculumMockCard({ className }: { className?: string }) {
  const items = [
    { label: 'Frontend Foundations', done: true },
    { label: 'React & TypeScript', done: true },
    { label: 'Backend with Node.js', done: false },
  ]
  return (
    <MockCard className={className}>
      <span className="text-ink-soft text-[11px] font-semibold tracking-wide uppercase">
        Course Curriculum
      </span>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <CheckCircle2
              className={cn('size-4 shrink-0', item.done ? 'text-success' : 'text-border')}
              aria-hidden="true"
            />
            <span
              className={cn(item.done ? 'text-ink-muted line-through' : 'text-ink font-medium')}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </MockCard>
  )
}

export function LessonPlayerMockCard({ className }: { className?: string }) {
  return (
    <MockCard className={cn('w-56', className)}>
      <div className="bg-charcoal relative flex h-28 items-center justify-center overflow-hidden rounded-xl">
        <div className="absolute inset-0 flex items-end gap-1 p-3 opacity-40">
          {[40, 65, 30, 80, 50, 70, 35].map((height, index) => (
            <span
              key={index}
              className="bg-primary flex-1 rounded-full"
              style={{ height: `${String(height)}%` }}
            />
          ))}
        </div>
        <PlayCircle className="text-primary relative size-11" aria-hidden="true" />
      </div>
      <p className="text-ink mt-3 text-sm font-bold">State Management with Hooks</p>
      <p className="text-ink-soft text-xs">Lesson 12 · 18 min</p>
    </MockCard>
  )
}

export function UpcomingBatchMockCard({ className }: { className?: string }) {
  return (
    <MockCard className={cn('w-52', className)}>
      <div className="flex items-center gap-2.5">
        <span className="bg-primary-soft text-primary-dark flex size-9 shrink-0 items-center justify-center rounded-xl">
          <Calendar className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-ink text-sm font-bold">Upcoming Batch</p>
          <p className="text-ink-soft text-xs">Starts in 18 days</p>
        </div>
      </div>
    </MockCard>
  )
}

export function MentorMockCard({ className }: { className?: string }) {
  return (
    <MockCard className={cn('w-56', className)}>
      <div className="flex items-center gap-3">
        <span className="bg-charcoal text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
          AM
        </span>
        <div>
          <p className="text-ink text-sm font-bold">Arjun Mehta</p>
          <p className="text-ink-soft text-xs">Mentor session · 6:00 PM</p>
        </div>
      </div>
    </MockCard>
  )
}

export function ResourceMockCard({ className }: { className?: string }) {
  return (
    <MockCard className={cn('w-48', className)}>
      <div className="flex items-center gap-2.5">
        <span className="bg-surface-raised text-ink-muted flex size-9 shrink-0 items-center justify-center rounded-xl">
          <FileText className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-ink text-sm font-semibold">Project Brief.pdf</p>
          <p className="text-ink-soft text-xs">2.4 MB</p>
        </div>
      </div>
    </MockCard>
  )
}
