import { type SubmitEvent, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react'

import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TextField, TextAreaField } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Reveal'
import { submitContactRequest } from '@/data/contact'
import { CONTACT_INFO } from '@/data/contact-info'

const DIRECT_CONTACT = [
  { icon: Mail, label: CONTACT_INFO.email, href: `mailto:${CONTACT_INFO.email}` },
  { icon: Phone, label: CONTACT_INFO.phone, href: CONTACT_INFO.phoneHref },
  { icon: MapPin, label: CONTACT_INFO.city, href: undefined },
]

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

export default function ContactPage() {
  const [searchParams] = useSearchParams()
  const programSlug = searchParams.get('program') ?? ''

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
    void submitContactRequest({ name, email, phone, programSlug, message })
      .then(() => {
        setIsSubmitted(true)
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  return (
    <>
      <Seo
        title="Contact Us"
        description="Get in touch with the Daisy Minds team about programs, batches, and applications."
        path="/contact"
      />

      <Section spacing="none" className="pt-36 pb-24 sm:pt-44">
        <Container size="narrow">
          <SectionHeading
            eyebrow="Get In Touch"
            title="Tell us what you're trying to build."
            lead="Share a few details and our team will follow up within one business day."
            align="center"
            className="mx-auto items-center text-center"
          />

          <Reveal
            delay={0.05}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
          >
            {DIRECT_CONTACT.map((item) => {
              const content = (
                <>
                  <item.icon className="text-primary-dark size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </>
              )
              return item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-ink-muted hover:text-ink inline-flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  {content}
                </a>
              ) : (
                <span
                  key={item.label}
                  className="text-ink-muted inline-flex items-center gap-2 text-sm font-medium"
                >
                  {content}
                </span>
              )
            })}
          </Reveal>

          <Reveal
            delay={0.1}
            className="border-border-soft bg-surface shadow-soft mt-12 rounded-2xl border p-6 sm:p-10"
          >
            {isSubmitted ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
                <CheckCircle2 className="text-success size-10" aria-hidden="true" />
                <h2 className="text-ink text-lg font-bold">Thanks — we've got your message.</h2>
                <p className="text-ink-muted max-w-sm">
                  A member of our team will reach out to {email || 'your inbox'} shortly.
                </p>
              </div>
            ) : (
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
                  label="What are you hoping to learn?"
                  required
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value)
                  }}
                  error={errors.message}
                  placeholder="Tell us about your background and what you're aiming for…"
                />
                <Button type="submit" size="lg" disabled={isSubmitting} className="w-fit">
                  {isSubmitting ? 'Sending…' : 'Send Message'}
                </Button>
              </form>
            )}
          </Reveal>
        </Container>
      </Section>
    </>
  )
}
