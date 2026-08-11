import { CalendarClock, MessagesSquare, Radar } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/motion/Reveal'
import { cn } from '@/utils/cn'

const EXPERIENCE_ITEMS = [
  {
    icon: CalendarClock,
    title: 'Live sessions, fixed schedule',
    description:
      'Classes run on a real weekly timetable with a mentor present — not a video queue you talk yourself out of opening.',
    detail: 'Typical week: 3 live sessions + 1 mentor review + project work.',
  },
  {
    icon: MessagesSquare,
    title: '1:1 project reviews',
    description:
      'Mentors review your actual submitted work, line by line, and leave specific feedback before you move to the next module.',
    detail: 'Every project gets a documented review, not a pass/fail quiz score.',
  },
  {
    icon: Radar,
    title: 'Always know where you stand',
    description:
      'Your learning dashboard shows real progress against the curriculum — never a vague completion percentage.',
    detail: 'Module-level tracking, visible to you and your mentor alike.',
  },
]

/** An alternating feature list — deliberately not a card grid, so three consecutive sections don't all read as the same "grid of tiles" pattern. */
export function LearningExperience() {
  return (
    <Section tone="surface">
      <Container>
        <SectionHeading
          eyebrow="The Learning Experience"
          title="Structured enough to finish. Flexible enough to fit your week."
          align="center"
          className="mx-auto items-center text-center"
        />

        <div className="mt-16 flex flex-col gap-14">
          {EXPERIENCE_ITEMS.map((item, index) => (
            <Reveal key={item.title}>
              <div
                className={cn(
                  'flex flex-col items-center gap-8 lg:flex-row lg:gap-16',
                  index % 2 === 1 && 'lg:flex-row-reverse',
                )}
              >
                <div className="border-border-soft bg-background flex size-40 shrink-0 items-center justify-center rounded-3xl border">
                  <item.icon
                    className="text-primary-dark size-14"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <div className="flex max-w-lg flex-col gap-3 text-center lg:text-left">
                  <h3 className="font-display text-display-sm text-ink">{item.title}</h3>
                  <p className="text-ink-muted text-body-lg">{item.description}</p>
                  <p className="text-primary-dark text-sm font-semibold">{item.detail}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}
