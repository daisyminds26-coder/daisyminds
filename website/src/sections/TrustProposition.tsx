import { Handshake, NotebookPen, Target } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/motion/Reveal'

const POINTS = [
  {
    icon: Target,
    title: 'Outcome-first',
    description: 'Every program is scoped around a real hiring outcome, not a syllabus checklist.',
  },
  {
    icon: NotebookPen,
    title: 'Built on real work',
    description: 'You leave with shipped projects, not certificates of attendance.',
  },
  {
    icon: Handshake,
    title: 'Mentors, not moderators',
    description: 'Working professionals review your work weekly and unblock you fast.',
  },
]

/** A slim, editorial proof band directly under the hero — deliberately not a card grid, so the page doesn't open with two visually identical sections back to back. */
export function TrustProposition() {
  return (
    <section className="border-border-soft bg-surface border-y">
      <Container className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-3 sm:gap-8 sm:py-14">
        {POINTS.map((point, index) => (
          <Reveal key={point.title} delay={index * 0.08} className="flex items-start gap-4">
            <point.icon className="text-primary-dark mt-0.5 size-6 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-ink text-base font-bold">{point.title}</h3>
              <p className="text-ink-muted text-body-sm mt-1">{point.description}</p>
            </div>
          </Reveal>
        ))}
      </Container>
    </section>
  )
}
