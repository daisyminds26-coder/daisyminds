import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/motion/Reveal'

const MILESTONES = [
  { label: 'Enroll', description: 'Get matched to a program and a live batch.' },
  { label: 'Build', description: 'Ship reviewed projects, module after module.' },
  { label: 'Prepare', description: 'Mock interviews and portfolio polish with your mentor.' },
  { label: 'Launch', description: 'Apply with a portfolio and mentor references behind you.' },
]

/** A connected timeline — visually distinct from the numbered `StepCard` grid in "How It Works," which describes the enrollment process rather than the multi-month arc this section covers. */
export function CareerJourney() {
  return (
    <Section tone="default">
      <Container>
        <SectionHeading
          eyebrow="The Career Journey"
          title="From first lesson to first offer."
          align="center"
          className="mx-auto items-center text-center"
        />

        <div className="relative mt-16">
          <div
            className="border-border absolute top-6 right-0 left-0 hidden border-t border-dashed lg:block"
            aria-hidden="true"
          />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-6">
            {MILESTONES.map((milestone, index) => (
              <Reveal
                key={milestone.label}
                delay={index * 0.1}
                className="relative flex flex-col items-start gap-3 lg:items-center lg:text-center"
              >
                <span className="border-primary bg-background text-primary-dark font-display relative z-10 flex size-12 items-center justify-center rounded-full border-2 text-lg font-bold">
                  {index + 1}
                </span>
                <h3 className="text-ink text-base font-bold">{milestone.label}</h3>
                <p className="text-ink-muted text-body-sm max-w-[16rem]">{milestone.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}
