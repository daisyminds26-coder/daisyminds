import { use } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { PlanCard } from '@/components/marketing/PlanCard'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import { Reveal } from '@/components/motion/Reveal'
import { getPlans, formatPlanPrice } from '@/data/plans'
import { buildBreadcrumbSchema } from '@/utils/structured-data'

const plansPromise = getPlans()

const COMPARISON_ROWS: {
  label: string
  values: [string, string, string]
}[] = [
  { label: 'Duration', values: ['30 Days', '2 Months', '6 Months'] },
  {
    label: 'Learning Depth',
    values: ['Core foundations', 'Applied practice', 'Comprehensive & intensive'],
  },
  {
    label: 'Mentorship',
    values: ['Doubt-clearing sessions', 'Regular check-ins', 'Priority mentor support'],
  },
  {
    label: 'Projects',
    values: ['Introductory exercises', 'Multiple guided projects', 'Multiple real-world projects'],
  },
  {
    label: 'Career Focus',
    values: ['Foundational understanding', 'Portfolio building', 'Placement Assistance'],
  },
  {
    label: 'Best For',
    values: [
      'First-time learners exploring a field',
      'Learners building practical skills',
      'Learners aiming for a full career transition',
    ],
  },
]

export default function PlansPage() {
  const plans = use(plansPromise)
  const [searchParams] = useSearchParams()
  const programSlug = searchParams.get('program') ?? undefined

  return (
    <>
      <Seo
        title="Plans"
        description="Choose the learning path that fits your goal — Short Term Foundation Modules, Specialized & Mid Level Training, or Advanced Job-Ready Bootcamps."
        path="/plans"
        keywords={[
          'learning plans',
          'course pricing',
          'bootcamp pricing',
          'foundation modules',
          'job-ready bootcamp',
        ]}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Plans', path: '/plans' },
        ])}
      />

      <Section spacing="none" className="pt-36 pb-16 sm:pt-44">
        <Container>
          <SectionHeading
            eyebrow="Choose Your Path"
            title="Choose the Learning Path That Fits Your Goal"
            lead="Flexible learning paths designed for different goals, timelines and experience levels."
            align="center"
            className="mx-auto items-center text-center"
          />

          <StaggerGroup className="mt-14 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <StaggerItem key={plan.id}>
                <PlanCard plan={plan} programSlug={programSlug} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      <Section tone="tint">
        <Container>
          <SectionHeading
            eyebrow="Compare Plans"
            title="See what's included at each level."
            align="center"
            className="mx-auto items-center text-center"
          />

          <Reveal delay={0.1} className="mt-12 overflow-x-auto">
            <table className="border-border-soft bg-surface w-full min-w-[42rem] border-separate border-spacing-0 overflow-hidden rounded-2xl border text-left">
              <thead>
                <tr>
                  <th className="text-ink-soft border-border-soft border-b px-5 py-4 text-xs font-semibold tracking-wide uppercase">
                    &nbsp;
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan.id}
                      scope="col"
                      className="text-ink border-border-soft border-b px-5 py-4 text-sm font-bold"
                    >
                      {plan.shortName}
                      <span className="text-ink-soft mt-0.5 block text-xs font-medium">
                        {formatPlanPrice(plan)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className="text-ink border-border-soft border-b px-5 py-4 text-sm font-semibold"
                    >
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td
                        key={`${row.label}-${plans[index]?.id ?? String(index)}`}
                        className="text-ink-muted border-border-soft border-b px-5 py-4 text-sm"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </Container>
      </Section>
    </>
  )
}
