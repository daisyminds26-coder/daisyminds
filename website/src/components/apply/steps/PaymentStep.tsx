import { ArrowLeft, Clock3, ShieldAlert } from 'lucide-react'

import type { ProgramListItem } from '@/types/program'
import type { Plan } from '@/types/plan'
import type { Applicant } from '@/components/apply/steps/AccountStep'
import { formatPlanPrice } from '@/data/plans'
import { Button } from '@/components/ui/Button'

interface PaymentStepProps {
  program: ProgramListItem
  plan: Plan
  applicant: Applicant
  onBack: () => void
}

/**
 * The honest payment boundary. No payment gateway is integrated on the
 * backend yet (confirmed — see README's "Payment Integration Boundary"),
 * so this step never simulates or fakes a successful payment or
 * Enrollllment. It states the real status plainly and stops here, exactly as
 * the brief requires: "Payment integration will be connected in the Fees &
 * Payments phase." `PaymentSuccessScreen` exists, built and ready, for the
 * moment that phase ships — it is intentionally never rendered from here.
 */
export function PaymentStep({ program, plan, applicant, onBack }: PaymentStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-display-sm text-ink">Payment</h2>
        <p className="text-ink-muted text-body-sm mt-1">Review your application before payment.</p>
      </div>

      <div className="border-border-soft bg-surface rounded-2xl border p-6">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-muted">Applicant</dt>
            <dd className="text-ink font-semibold">{applicant.name}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-muted">Program</dt>
            <dd className="text-ink font-semibold">{program.title}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-muted">Plan</dt>
            <dd className="text-ink font-semibold">{plan.name}</dd>
          </div>
          <div className="border-border-soft flex items-center justify-between border-t pt-3">
            <dt className="text-ink-muted">Amount Due</dt>
            <dd className="text-ink font-display text-lg font-bold">{formatPlanPrice(plan)}</dd>
          </div>
        </dl>
      </div>

      {applicant.method === 'register-pending' && (
        <div className="border-info/30 bg-info/10 flex items-start gap-3 rounded-xl border p-4">
          <Clock3 className="text-info mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-ink-muted text-body-sm">
            Your application details have been saved. Our admissions team will confirm your account
            setup shortly — you don't need to do anything else right now.
          </p>
        </div>
      )}

      <div className="border-warning/30 bg-warning/10 flex items-start gap-3 rounded-xl border p-5">
        <ShieldAlert className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-ink text-sm font-semibold">Payment integration is not live yet</p>
          <p className="text-ink-muted text-body-sm mt-1">
            Payment integration will be connected in the Fees &amp; Payments phase. Your application
            is saved with the program and plan above — our team will reach out to confirm your batch
            and payment details before your program's start date.
          </p>
        </div>
      </div>

      <Button
        onClick={onBack}
        variant="ghost"
        size="lg"
        icon={<ArrowLeft className="size-4.5" />}
        className="w-fit"
      >
        Back
      </Button>
    </div>
  )
}
