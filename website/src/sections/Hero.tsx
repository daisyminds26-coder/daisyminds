import { ArrowRight, Compass, ShieldCheck, Sparkles, Users } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Badge'
import { StatPill } from '@/components/ui/StatPill'
import { Reveal } from '@/components/motion/Reveal'
import { FloatingCard } from '@/components/motion/FloatingCard'
import {
  CurriculumMockCard,
  LessonPlayerMockCard,
  MentorMockCard,
  MyLearningMockCard,
  UpcomingBatchMockCard,
} from '@/components/marketing/ProductMockCards'

const TRUST_INDICATORS = [
  { icon: <Users className="size-full" />, label: 'Mentor-led, not self-serve' },
  { icon: <Sparkles className="size-full" />, label: 'Project-first curriculum' },
  { icon: <ShieldCheck className="size-full" />, label: 'Small, focused batches' },
]

/**
 * The art-directed two-part hero the brief asks for: headline + CTAs + trust
 * indicators on the left, a layered Daisy Minds LMS product composition on
 * the right (illustrative mockups only — see `ProductMockCards`). Ambient
 * grid/gradient background, no photography, no stock illustration.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-28 lg:pb-32">
      <div
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      />
      <div
        className="bg-primary/25 pointer-events-none absolute top-[-12rem] right-[-8rem] size-[34rem] rounded-full blur-3xl"
        aria-hidden="true"
      />

      <Container className="relative grid grid-cols-1 items-center gap-16 lg:grid-cols-[1fr_1fr] lg:gap-8">
        <div className="flex flex-col items-start gap-7">
          <Reveal>
            <Eyebrow>Mentor-Led Career Programs</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="font-display text-display-xl sm:text-display-2xl text-ink text-balance">
              Careers built on <span className="text-primary-dark">real projects</span>, not lecture
              slides.
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="text-lead text-ink-muted max-w-lg text-balance">
              Daisy Minds pairs a project-first curriculum with mentors who review your actual work
              — so what you learn is what employers are actually hiring for.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="flex flex-wrap items-center gap-3">
              <Button href="/programs" size="lg" trailingIcon={<ArrowRight className="size-4.5" />}>
                Explore Programs
              </Button>
              <Button
                href="/#how-it-works"
                variant="ghost"
                size="lg"
                icon={<Compass className="size-4.5" />}
              >
                How It Works
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {TRUST_INDICATORS.map((item) => (
                <StatPill key={item.label} icon={item.icon}>
                  {item.label}
                </StatPill>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="relative mx-auto h-[26rem] w-full max-w-md lg:h-[30rem]">
          <FloatingCard className="absolute top-0 left-0 z-20 -rotate-3" duration={6} distance={12}>
            <MyLearningMockCard />
          </FloatingCard>
          <FloatingCard
            className="absolute top-8 right-0 z-10 rotate-2"
            duration={5.5}
            delay={0.4}
            distance={10}
          >
            <CurriculumMockCard />
          </FloatingCard>
          <FloatingCard
            className="absolute bottom-24 left-4 z-30 rotate-1"
            duration={7}
            delay={0.8}
            distance={9}
          >
            <LessonPlayerMockCard />
          </FloatingCard>
          <FloatingCard
            className="absolute right-2 bottom-0 z-20 -rotate-2"
            duration={6.5}
            delay={0.2}
            distance={11}
          >
            <MentorMockCard />
          </FloatingCard>
          <FloatingCard
            className="absolute bottom-2 left-1/3 z-0 rotate-3"
            duration={5}
            delay={1.1}
            distance={8}
          >
            <UpcomingBatchMockCard />
          </FloatingCard>
        </Reveal>
      </Container>
    </section>
  )
}
