import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { lmsRoute } from '@/utils/env'

interface PaymentSuccessScreenProps {
  programTitle: string
  planName: string
  amountLabel: string
  /** A real, server-issued Enrollllment/order reference — never generate one client-side. */
  reference: string
}

/**
 * Built and ready for the Fees & Payments phase, but intentionally NOT
 * wired into any reachable state today — no code path in `ApplyPage.tsx`
 * can render this, because no real payment has ever been confirmed. Do
 * not connect this until a server-side payment verification step exists
 * (see README's "Payment Integration Boundary"); connecting it to a
 * client-only `?payment=success` callback would fake Enrollllment, which is
 * explicitly disallowed.
 */
export function PaymentSuccessScreen({
  programTitle,
  planName,
  amountLabel,
  reference,
}: PaymentSuccessScreenProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <CheckCircle2 className="text-success size-14" aria-hidden="true" />
      <div>
        <h2 className="font-display text-display-sm text-ink">Payment Successful</h2>
        <p className="text-ink-muted text-body-sm mt-2">
          Your Enrollllment is confirmed. A confirmation email has been sent to you.
        </p>
      </div>

      <dl className="border-border-soft bg-surface w-full max-w-sm rounded-2xl border p-6 text-left text-sm">
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-ink-muted">Program</dt>
          <dd className="text-ink font-semibold">{programTitle}</dd>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-ink-muted">Plan</dt>
          <dd className="text-ink font-semibold">{planName}</dd>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-ink-muted">Amount Paid</dt>
          <dd className="text-ink font-semibold">{amountLabel}</dd>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-ink-muted">Enrollllment Reference</dt>
          <dd className="text-ink font-semibold">{reference}</dd>
        </div>
      </dl>

      <div className="text-ink-muted max-w-sm text-sm">
        <p className="text-ink font-semibold">Next Steps</p>
        <p className="mt-1">
          Our team will reach out with your batch schedule and onboarding details. You can also
          access your student portal now.
        </p>
      </div>

      <Button
        href={lmsRoute('/login')}
        external
        size="lg"
        trailingIcon={<ArrowRight className="size-4.5" />}
      >
        Go to Student Portal
      </Button>
    </div>
  )
}
