import { Suspense, use, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Reveal } from '@/components/motion/Reveal'
import { StepperNav } from '@/components/apply/StepperNav'
import { ApplicationSummaryCard } from '@/components/apply/ApplicationSummaryCard'
import { ProgramStep } from '@/components/apply/steps/ProgramStep'
import { PlanStep } from '@/components/apply/steps/PlanStep'
import { AccountStep, type Applicant } from '@/components/apply/steps/AccountStep'
import { PaymentStep } from '@/components/apply/steps/PaymentStep'
import { ProgramsErrorBoundary } from '@/components/error/ProgramsErrorBoundary'
import { useApplicationState, type ApplicationStep } from '@/hooks/useApplicationState'
import { getPrograms } from '@/services/public-programs-service'
import { getPlans } from '@/data/plans'
import type { ProgramListItem } from '@/types/program'
import type { Plan } from '@/types/plan'

export default function ApplyPage() {
  const [retryCount, setRetryCount] = useState(0)

  return (
    <>
      <Seo
        title="Apply"
        description="Apply to a Daisy Minds program — choose your program, learning path, and account details."
        path="/apply"
        noIndex
      />
      <ProgramsErrorBoundary
        onRetry={() => {
          setRetryCount((count) => count + 1)
        }}
      >
        <Suspense
          key={retryCount}
          fallback={<Section spacing="none" className="min-h-[70vh] pt-36" />}
        >
          <ApplyFlow />
        </Suspense>
      </ProgramsErrorBoundary>
    </>
  )
}

function ApplyFlow() {
  const dataPromise = useMemo<Promise<[ProgramListItem[], Plan[]]>>(
    () => Promise.all([getPrograms(), getPlans()]),
    [],
  )
  const [programs, plans] = use(dataPromise)
  const [searchParams] = useSearchParams()

  const { programSlug, planSlug, step, setProgramSlug, setPlanSlug, setStep } = useApplicationState(
    {
      programSlug: searchParams.get('program') ?? undefined,
      planSlug: searchParams.get('plan') ?? undefined,
    },
  )

  const [applicant, setApplicant] = useState<Applicant | undefined>(undefined)
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false)

  const selectedProgram = programs.find((program) => program.slug === programSlug)
  const selectedPlan = plans.find((plan) => plan.slug === planSlug)

  const reachableSteps: ApplicationStep[] = ['program']
  if (selectedProgram) reachableSteps.push('plan')
  if (selectedProgram && selectedPlan) reachableSteps.push('account')
  if (selectedProgram && selectedPlan && applicant) reachableSteps.push('payment')

  function goToStep(target: ApplicationStep) {
    if (reachableSteps.includes(target)) setStep(target)
  }

  return (
    <Section spacing="none" className="pt-32 pb-24 sm:pt-40">
      <Container size="narrow">
        <Reveal className="mb-8 flex flex-col gap-6">
          <div>
            <h1 className="font-display text-display-md text-ink">Apply to Daisy Minds</h1>
            <p className="text-ink-muted text-body-sm mt-1">
              A few quick steps to start your application.
            </p>
          </div>
          <StepperNav currentStep={step} reachableSteps={reachableSteps} onStepClick={goToStep} />
        </Reveal>
      </Container>

      <Container>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            {/* Mobile: collapsible summary above the form. */}
            <div className="mb-6 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  setMobileSummaryOpen((open) => !open)
                }}
                aria-expanded={mobileSummaryOpen}
                aria-controls="mobile-application-summary"
                className="border-border-soft bg-surface flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold"
              >
                Application Summary
                <ChevronDown
                  className={
                    mobileSummaryOpen
                      ? 'size-4 rotate-180 transition-transform'
                      : 'size-4 transition-transform'
                  }
                  aria-hidden="true"
                />
              </button>
              {mobileSummaryOpen && (
                <div id="mobile-application-summary" className="mt-3">
                  <ApplicationSummaryCard program={selectedProgram} plan={selectedPlan} />
                </div>
              )}
            </div>

            <Reveal
              key={step}
              className="border-border-soft bg-surface shadow-soft rounded-2xl border p-6 sm:p-8"
            >
              {step === 'program' && (
                <ProgramStep
                  programs={programs}
                  selectedProgram={selectedProgram}
                  onSelect={setProgramSlug}
                  onContinue={() => {
                    setStep('plan')
                  }}
                />
              )}

              {step === 'plan' && selectedProgram && (
                <PlanStep
                  plans={plans}
                  selectedPlan={selectedPlan}
                  onSelect={setPlanSlug}
                  onBack={() => {
                    setStep('program')
                  }}
                  onContinue={() => {
                    setStep('account')
                  }}
                />
              )}

              {step === 'account' && selectedProgram && selectedPlan && (
                <AccountStep
                  onBack={() => {
                    setStep('plan')
                  }}
                  onAuthenticated={(nextApplicant) => {
                    setApplicant(nextApplicant)
                    setStep('payment')
                  }}
                />
              )}

              {step === 'payment' && selectedProgram && selectedPlan && applicant && (
                <PaymentStep
                  program={selectedProgram}
                  plan={selectedPlan}
                  applicant={applicant}
                  onBack={() => {
                    setStep('account')
                  }}
                />
              )}
            </Reveal>
          </div>

          <div className="hidden lg:block">
            <ApplicationSummaryCard
              program={selectedProgram}
              plan={selectedPlan}
              className="sticky top-24"
            />
          </div>
        </div>
      </Container>
    </Section>
  )
}
