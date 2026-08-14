import { type SubmitEvent, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

import { TextField, TextAreaField } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { submitContactRequest } from '@/data/contact'

interface FormErrors {
  name?: string
  email?: string
  message?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values: { name: string; email: string; message: string }): FormErrors {
  const errors: FormErrors = {}
  if (values.name.trim().length < 2) {
    errors.name = 'Enter your full name'
  }
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address'
  }
  if (values.message.trim().length < 10) {
    errors.message = 'Tell us a little more (at least 10 characters)'
  }
  return errors
}

interface ContactFormProps {
  /** Carried into the submitted payload — set by `ContactPage.tsx` from `?program=`. */
  programSlug?: string
  /** Carried into the submitted payload — set by `ServiceDetailPage.tsx`'s "Get in Touch" dialog. */
  serviceSlug?: string
  messageLabel?: string
  messagePlaceholder?: string
  onSubmitted?: () => void
}

/**
 * The contact form itself — extracted from `ContactPage.tsx` so
 * `ServiceDetailPage.tsx`'s "Get in Touch" `Dialog` can reuse the exact
 * same validated, wired-up form instead of a second implementation. The
 * caller owns the surrounding card/section chrome (padding, border,
 * shadow) — this component is just the field/submit/success-state logic.
 */
export function ContactForm({
  programSlug = '',
  serviceSlug = '',
  messageLabel = 'What are you hoping to learn?',
  messagePlaceholder = "Tell us about your background and what you're aiming for…",
  onSubmitted,
}: ContactFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validate({ name, email, message })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    void submitContactRequest({ name, email, phone, programSlug, serviceSlug, message })
      .then(() => {
        setIsSubmitted(true)
        onSubmitted?.()
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
        <CheckCircle2 className="text-success size-10" aria-hidden="true" />
        <h2 className="text-ink text-lg font-bold">Thanks — we've got your message.</h2>
        <p className="text-ink-muted max-w-sm">
          A member of our team will reach out to {email || 'your inbox'} shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label="Full name"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value)
          }}
          error={errors.name}
          autoComplete="name"
        />
        <TextField
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
          }}
          error={errors.email}
          autoComplete="email"
        />
      </div>
      <TextField
        label="Phone (optional)"
        type="tel"
        value={phone}
        onChange={(event) => {
          setPhone(event.target.value)
        }}
        autoComplete="tel"
      />
      <TextAreaField
        label={messageLabel}
        required
        value={message}
        onChange={(event) => {
          setMessage(event.target.value)
        }}
        error={errors.message}
        placeholder={messagePlaceholder}
      />
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? 'Sending…' : 'Send Message'}
      </Button>
    </form>
  )
}
