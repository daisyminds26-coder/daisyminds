import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'

import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { Reveal } from '@/components/motion/Reveal'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import { TechBadge } from '@/components/marketing/TechBadge'
import { ContactForm } from '@/components/contact/ContactForm'
import { SERVICES } from '@/data/services'
import { buildBreadcrumbSchema } from '@/utils/structured-data'
import { SITE_URL } from '@/utils/env'

/**
 * Static — Services have no backend module (confirmed scope; unlike
 * Programs, which fetch from the LMS Course Management public API). No
 * Suspense/error-boundary/loading state needed, matching `ServicesPage.tsx`.
 */
export default function ServiceDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const service = SERVICES.find((item) => item.slug === slug)
  const [contactOpen, setContactOpen] = useState(false)

  if (!service) {
    return (
      <Section
        spacing="none"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 pt-36 text-center"
      >
        <Seo
          title="Service Not Found"
          description="This service could not be found."
          path={`/services/${slug}`}
          noIndex
        />
        <h1 className="font-display text-display-sm text-ink">We couldn't find that service</h1>
        <p className="text-ink-muted">It may have moved, or the link may be out of date.</p>
        <Button href="/services" variant="ghost" icon={<ArrowLeft className="size-4" />}>
          Back to all services
        </Button>
      </Section>
    )
  }

  return (
    <>
      <Seo
        title={service.seo.title}
        description={service.seo.description}
        path={`/services/${service.slug}`}
        keywords={[service.title, ...service.technologies, 'Daisy Minds']}
        image={`${SITE_URL}${service.heroImage.src}`}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
          { name: service.title, path: `/services/${service.slug}` },
        ])}
      />

      {/* 1. Hero */}
      <Section spacing="none" className="pt-36 pb-16 sm:pt-44">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-1.5 text-sm">
            <Link
              to="/services"
              className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="size-4" />
              All Services
            </Link>
          </nav>

          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <Reveal className="flex flex-col gap-6">
              <span className="bg-primary-soft text-primary-dark flex size-14 items-center justify-center rounded-2xl">
                <service.icon className="size-6" aria-hidden="true" />
              </span>
              <h1 className="font-display text-display-lg text-ink text-balance">
                {service.title}
              </h1>
              <p className="text-lead text-ink-muted">{service.description}</p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="lg"
                  trailingIcon={<ArrowRight className="size-4.5" />}
                  onClick={() => {
                    setContactOpen(true)
                  }}
                >
                  Get in Touch
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <ResponsiveImage
                src={service.heroImage.src}
                alt={service.heroImage.alt}
                aspectRatio="4/3"
                priority
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="rounded-3xl shadow-[0_30px_60px_-20px_rgb(33_29_25/0.25)]"
              />
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* 2. Key Offerings */}
      <Section tone="surface">
        <Container>
          <SectionHeading eyebrow="What's Included" title="Key Offerings" />
          <StaggerGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {service.keyOfferings.map((item) => (
              <StaggerItem key={item.title}>
                <div className="border-border-soft bg-background flex h-full flex-col gap-2.5 rounded-2xl border p-5">
                  <CheckCircle2 className="text-success size-5 shrink-0" aria-hidden="true" />
                  <p className="text-ink font-semibold">{item.title}</p>
                  <p className="text-ink-muted text-body-sm">{item.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      {/* 3. Our Process */}
      <Section tone="default">
        <Container>
          <SectionHeading
            eyebrow="Our Approach"
            title="How We Work"
            lead="A consistent process, adapted to your project — not a rigid template."
          />
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {service.process.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.06}>
                <div className="border-border-soft bg-surface flex gap-4 rounded-xl border p-5">
                  <span className="text-primary-dark font-display shrink-0 text-lg font-bold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-ink font-semibold">{step.title}</p>
                    <p className="text-ink-muted text-body-sm mt-0.5">{step.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* 4. Technologies */}
      <Section tone="surface">
        <Container>
          <SectionHeading eyebrow="Technologies" title="What We Work With" />
          <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-3">
            {service.technologies.map((tech) => (
              <TechBadge key={tech} name={tech} />
            ))}
          </Reveal>
        </Container>
      </Section>

      {/* 5. Why Daisy Minds for This */}
      <Section tone="default">
        <Container>
          <SectionHeading eyebrow="Why Daisy Minds" title="Why Choose Us for This" />
          <StaggerGroup className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {service.benefits.map((benefit) => (
              <StaggerItem key={benefit.title}>
                <div className="border-border-soft bg-surface shadow-soft flex h-full flex-col gap-2 rounded-2xl border p-6">
                  <p className="text-ink text-base font-bold">{benefit.title}</p>
                  <p className="text-ink-muted text-body-sm">{benefit.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      {/* 6. Final CTA */}
      <Section tone="charcoal" spacing="compact" grid>
        <Container className="flex flex-col items-center gap-6 text-center">
          <Reveal>
            <Eyebrow tone="light">{service.title}</Eyebrow>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="font-display text-display-lg max-w-2xl text-balance text-white">
              Have a project in mind?
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="text-lead max-w-lg text-white/70">
              Tell us what you're building and we'll get back to you within one business day.
            </p>
          </Reveal>
          <Reveal delay={0.18} className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              trailingIcon={<ArrowRight className="size-4.5" />}
              onClick={() => {
                setContactOpen(true)
              }}
            >
              Get in Touch
            </Button>
          </Reveal>
        </Container>
      </Section>

      <Dialog
        open={contactOpen}
        onClose={() => {
          setContactOpen(false)
        }}
        title={`Contact us about ${service.title}`}
      >
        <h2 className="font-display text-display-xs text-ink mb-1 pr-8">Get in Touch</h2>
        <p className="text-ink-muted text-body-sm mb-6">
          Tell us about your {service.title.toLowerCase()} project and we'll get back to you within
          one business day.
        </p>
        {/* No onSubmitted handler — the success state renders in place inside
            the dialog (matching ContactPage.tsx's own behavior), the dialog
            simply stays open so the visitor sees the confirmation. */}
        <ContactForm
          serviceSlug={service.slug}
          messageLabel="Tell us about your project"
          messagePlaceholder="What are you looking to build?"
        />
      </Dialog>
    </>
  )
}
