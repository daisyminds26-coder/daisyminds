import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TrainerCard } from '@/components/marketing/TrainerCard'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import type { Trainer } from '@/types/trainer'

export function TrainerShowcase({ trainers }: { trainers: Trainer[] }) {
  return (
    <Section id="trainers" tone="tint">
      <Container>
        <SectionHeading
          eyebrow="Learn From Practitioners"
          title="Mentors who still do the work they teach."
          align="center"
          className="mx-auto items-center text-center"
        />

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
