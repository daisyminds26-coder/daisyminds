import { FileCheck2, GraduationCap, PenTool, UsersRound } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { StepCard } from '@/components/marketing/StepCard'
import { Reveal } from '@/components/motion/Reveal'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'

const STEPS = [
  {
    icon: FileCheck2,
    title: 'Apply & get matched',
    description:
      'Tell us your goal and experience level — we match you to the right program and batch.',
  },
  {
    icon: UsersRound,
    title: 'Join a live batch',
    description:
      'Learn alongside a small cohort on a fixed weekly schedule, not an empty self-paced queue.',
  },
  {
    icon: PenTool,
    title: 'Build real projects',
    description:
      'Every module ends in a shipped project, reviewed 1:1 by a mentor before you move on.',
  },
  {
    icon: GraduationCap,
    title: 'Graduate portfolio-ready',
    description: 'Leave with a body of work and interview preparation, not just a certificate.',
  },
]

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="tint">
      <Container>
        <SectionHeading
          eyebrow="How Daisy Minds Works"
          title="A structured path from Enrollllment to portfolio."
          align="center"
          className="mx-auto items-center text-center"
        />

        <Reveal delay={0.05} className="mx-auto mt-10 max-w-3xl">
          <ResponsiveImage
            src="/images/students/coding-closeup.jpg"
            alt="Close-up of hands typing code on a laptop keyboard"
            aspectRatio="21/9"
            className="rounded-3xl"
          />
        </Reveal>

        <StaggerGroup className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((step, index) => (
            <StaggerItem key={step.title}>
              <StepCard
                index={index + 1}
                icon={step.icon}
                title={step.title}
                description={step.description}
              />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
