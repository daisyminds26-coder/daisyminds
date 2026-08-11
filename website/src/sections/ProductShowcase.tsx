import { CheckCircle2 } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/motion/Reveal'
import { FloatingCard } from '@/components/motion/FloatingCard'
import {
  CurriculumMockCard,
  LessonPlayerMockCard,
  ResourceMockCard,
} from '@/components/marketing/ProductMockCards'

const FEATURES = [
  'A structured curriculum with clear module-by-module progress',
  'A distraction-free lesson player built for focused sessions',
  'Direct access to project briefs, resources, and mentor notes',
]

/** The dedicated LMS product-showcase moment — inverted (charcoal) tone and a different mock-card composition than the hero, so this reads as its own beat, not a repeat. */
export function ProductShowcase() {
  return (
    <Section tone="charcoal" grid>
      <Container className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Inside the Daisy Minds LMS"
            title="A learning platform built for depth, not just delivery."
            lead="The same platform every enrolled student and mentor uses daily — structured, focused, and free of the clutter most course platforms bury you in."
            tone="light"
          />
          <ul className="flex flex-col gap-3">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature} delay={0.1 + index * 0.06} className="flex items-start gap-3">
                <CheckCircle2 className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span className="text-body-lg text-white/80">{feature}</span>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={0.15} className="relative mx-auto h-96 w-full max-w-sm">
          <FloatingCard className="absolute top-2 left-0 z-20" duration={6} distance={10}>
            <LessonPlayerMockCard className="w-72" />
          </FloatingCard>
          <FloatingCard
            className="absolute right-0 bottom-4 z-10 rotate-2"
            duration={5.5}
            delay={0.5}
            distance={9}
          >
            <CurriculumMockCard />
          </FloatingCard>
          <FloatingCard
            className="absolute bottom-0 left-6 z-30 -rotate-3"
            duration={6.5}
            delay={0.9}
            distance={8}
          >
            <ResourceMockCard />
          </FloatingCard>
        </Reveal>
      </Container>
    </Section>
  )
}
