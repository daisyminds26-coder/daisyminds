import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { BatchCard } from '@/components/marketing/BatchCard'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import type { UpcomingBatch } from '@/types/batch'

export function UpcomingBatches({ batches }: { batches: UpcomingBatch[] }) {
  if (batches.length === 0) return null

  return (
    <Section tone="surface">
      <Container>
        <SectionHeading
          eyebrow="Upcoming Batches"
          title="A handful of open seats across our next cohorts."
          lead="Batches are kept intentionally small — apply early if a start date works for you."
        />

        <StaggerGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {batches.map((batch) => (
            <StaggerItem key={batch.id}>
              <BatchCard batch={batch} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
