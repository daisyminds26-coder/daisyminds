import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Eyebrow } from '@/components/ui/Badge'
import { Reveal } from '@/components/motion/Reveal'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import { WHY_DAISY_MINDS_REASONS } from '@/data/why-daisy-minds'

/** The site's "why choose us" moment — headline/intro is real copy from daisyminds.com; the six reason cards below follow the institute's own published messaging (shared with every program detail page via `data/why-daisy-minds.ts`). */
export function WhyDaisyMinds() {
  return (
    <Section id="why-daisy-minds" tone="default">
      <Container>
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <Eyebrow>About Daisy Minds</Eyebrow>
          <p className="font-display text-display-md text-ink text-balance">
            Over 10 years in distance learning for skill development.
          </p>
          <p className="text-lead text-ink-muted max-w-md">
            At Daisy Minds, we are committed to not only providing you with top-quality education
            but also helping you take the next step in your career.
          </p>
        </Reveal>

        <StaggerGroup className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_DAISY_MINDS_REASONS.map((reason) => (
            <StaggerItem key={reason.title}>
              <div className="border-border-soft bg-surface shadow-soft hover:shadow-lifted flex h-full flex-col gap-4 rounded-2xl border p-6 transition-shadow duration-300">
                <span className="bg-primary-soft text-primary-dark flex size-12 items-center justify-center rounded-xl">
                  <reason.icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="text-ink text-base font-bold">{reason.title}</h3>
                <p className="text-ink-muted text-body-sm">{reason.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
