import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { TrainerCard } from '@/components/marketing/TrainerCard'
import { Reveal } from '@/components/motion/Reveal'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import type { Trainer } from '@/types/trainer'

export function TrainerShowcase({ trainers }: { trainers: Trainer[] }) {
  return (
    <Section id="trainers" tone="tint">
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <ResponsiveImage
              src="/images/mentors/trainer-mentoring.jpg"
              alt="A Daisy Minds mentor pointing at a laptop screen while explaining a concept to a student"
              aspectRatio="4/3"
              sizes="(min-width: 1024px) 36vw, 90vw"
              className="rounded-3xl"
            />
          </Reveal>
          <SectionHeading
            eyebrow="Learn From Practitioners"
            title="Mentors who still do the work they teach."
          />
        </div>

        <StaggerGroup className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trainers.map((trainer) => (
            <StaggerItem key={trainer.slug}>
              <TrainerCard trainer={trainer} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
