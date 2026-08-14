import {
  ArrowRight,
  GraduationCap,
  Handshake,
  LayoutGrid,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Badge'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { Reveal } from '@/components/motion/Reveal'
import { FloatingCard } from '@/components/motion/FloatingCard'
import { lmsRoute } from '@/utils/env'

const STAT_PROGRAM_COUNT = { icon: LayoutGrid, label: '9+ Programs' }
const STAT_HANDS_ON = { icon: Wrench, label: 'Hands-on Learning' }
const STAT_MENTORSHIP = { icon: GraduationCap, label: 'Expert Mentorship' }
const STAT_PLACEMENT = { icon: Handshake, label: 'Placement Assistance' }

/**
 * The art-directed two-part hero: headline + CTAs on the left, a real
 * photographic image on the right with subtle floating proof-point cards.
 * No fabricated stats — every floating card states a real program feature,
 * never an invented Enrollllment count or placement percentage.
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
            <Eyebrow>Career-Focused Technology Training</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="font-display text-display-xl sm:text-display-2xl text-ink text-balance">
              Build Skills. Create Opportunities.{' '}
              <span className="text-primary-dark">Shape Your Future.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="text-lead text-ink-muted max-w-lg text-balance">
              Industry-oriented technology programs with expert mentorship, hands-on learning and
              career-focused training.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="flex flex-wrap items-center gap-3">
              <Button href="/programs" size="lg" trailingIcon={<ArrowRight className="size-4.5" />}>
                Explore Programs
              </Button>
              <Button href="/apply" variant="secondary" size="lg">
                Apply Now
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <Button href={lmsRoute('/login')} external variant="link" className="text-ink-muted">
              Already a student? Student Login
            </Button>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="relative mx-auto h-[26rem] w-full max-w-md lg:h-[30rem]">
          <ResponsiveImage
            src="/images/hero/homepage-hero.jpg"
            alt="A Daisy Minds student working on a laptop, engaged in a hands-on technology project"
            aspectRatio="4/5"
            priority
            sizes="(min-width: 1024px) 32rem, 90vw"
            className="h-full rounded-3xl shadow-[0_30px_60px_-20px_rgb(33_29_25/0.35)]"
          />

          <FloatingCard
            className="absolute top-4 -left-6 z-20 hidden sm:block"
            duration={6}
            distance={10}
          >
            <FloatingStat icon={STAT_PROGRAM_COUNT.icon} label={STAT_PROGRAM_COUNT.label} />
          </FloatingCard>
          <FloatingCard
            className="absolute top-1/3 -right-6 z-20 hidden sm:block"
            duration={5.5}
            delay={0.4}
            distance={9}
          >
            <FloatingStat icon={STAT_HANDS_ON.icon} label={STAT_HANDS_ON.label} />
          </FloatingCard>
          <FloatingCard
            className="absolute bottom-24 -left-8 z-20 hidden sm:block"
            duration={6.5}
            delay={0.8}
            distance={11}
          >
            <FloatingStat icon={STAT_MENTORSHIP.icon} label={STAT_MENTORSHIP.label} />
          </FloatingCard>
          <FloatingCard
            className="absolute -right-4 bottom-4 z-20 hidden sm:block"
            duration={5}
            delay={0.2}
            distance={8}
          >
            <FloatingStat icon={STAT_PLACEMENT.icon} label={STAT_PLACEMENT.label} />
          </FloatingCard>
        </Reveal>
      </Container>
    </section>
  )
}

function FloatingStat({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="border-border-soft bg-surface/95 shadow-lifted flex items-center gap-2.5 rounded-2xl border px-4 py-3 backdrop-blur-sm">
      <span className="bg-primary-soft text-primary-dark flex size-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="text-ink text-sm font-semibold whitespace-nowrap">{label}</span>
    </div>
  )
}
