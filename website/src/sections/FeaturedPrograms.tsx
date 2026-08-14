import { ArrowRight } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { ProgramCard } from '@/components/marketing/ProgramCard'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import type { Program } from '@/types/program'

export function FeaturedPrograms({ programs }: { programs: Program[] }) {
  return (
    <Section tone="default">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Featured Programs"
            title="Programs built around one outcome: hireable skills."
            lead="Every program pairs a project-based curriculum with weekly mentor review — pick the track that matches where you want to end up."
          />
          <Button href="/services" variant="ghost" trailingIcon={<ArrowRight className="size-4" />}>
            View All Programs
          </Button>
        </div>

        <StaggerGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <StaggerItem key={program.slug}>
              <ProgramCard program={program} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
