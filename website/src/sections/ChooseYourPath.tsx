import { use } from 'react'
import { ArrowRight } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { PlanCard } from '@/components/marketing/PlanCard'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import { getPlans } from '@/data/plans'

/** Module-scope — this section's parent page is only ever imported once via `React.lazy`, so `use()` always sees a stable promise reference. */
const plansPromise = getPlans()

export function ChooseYourPath() {
  const plans = use(plansPromise)

  return (
    <Section tone="surface">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Pricing"
            title="Choose Your Path"
            lead="Flexible learning paths designed for different goals, timelines and experience levels."
          />
          <Button href="/plans" variant="ghost" trailingIcon={<ArrowRight className="size-4" />}>
            Explore Plans
          </Button>
        </div>

        <StaggerGroup className="mt-12 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <StaggerItem key={plan.id}>
              <PlanCard plan={plan} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
