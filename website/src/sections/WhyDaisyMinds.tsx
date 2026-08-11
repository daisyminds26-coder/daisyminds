import { GraduationCap, Infinity as InfinityIcon, Users2 } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Eyebrow } from '@/components/ui/Badge'
import { Reveal } from '@/components/motion/Reveal'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'

const REASONS = [
  {
    icon: Users2,
    title: 'Expert Trainers',
    description: 'Every course is led by mentors with real, hands-on industry experience.',
  },
  {
    icon: GraduationCap,
    title: 'Online Remote Learning',
    description: 'Learn from anywhere on a structured schedule built around live sessions.',
  },
  {
    icon: InfinityIcon,
    title: 'Lifetime Access',
    description: 'Course material and recordings stay available to you long after you graduate.',
  },
]

/** The site's "About" moment — real copy from daisyminds.com, not invented. */
export function WhyDaisyMinds() {
  return (
    <Section id="why-daisy-minds" tone="default">
      <Container className="grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <Reveal className="flex flex-col gap-6">
          <Eyebrow>About Daisy Minds</Eyebrow>
          <p className="font-display text-display-md text-ink text-balance">
            Over 10 years in distance learning for skill development.
          </p>
          <p className="text-lead text-ink-muted max-w-md">
            At Daisy Minds, we are committed to not only providing you with top-quality education
            but also helping you take the next step in your career.
          </p>
        </Reveal>

        <StaggerGroup className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {REASONS.map((reason) => (
            <StaggerItem key={reason.title} className="flex flex-col gap-3">
              <reason.icon className="text-primary-dark size-6" aria-hidden="true" />
              <h3 className="text-ink text-base font-bold">{reason.title}</h3>
              <p className="text-ink-muted text-body-sm">{reason.description}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
