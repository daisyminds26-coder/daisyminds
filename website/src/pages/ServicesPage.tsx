import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import { buildBreadcrumbSchema } from '@/utils/structured-data'
import { SERVICES } from '@/data/services'

/**
 * Daisy Minds' client-facing technology services — a static listing page
 * (`data/services.ts`) linking into individual `ServiceDetailPage.tsx`
 * pages. For student training programs, see `ProgramsPage.tsx`
 * (`/programs`, backed by the LMS Course Management API) — the two are
 * deliberately separate sections, not the same content under two URLs.
 */
export default function ServicesPage() {
  return (
    <>
      <Seo
        title="Services"
        description="Technology services for businesses — web, mobile, custom software, AI, data, cloud, DevOps, cybersecurity, and digital marketing."
        path="/services"
        keywords={[
          'technology services',
          'web development services',
          'mobile app development',
          'custom software development',
          'AI solutions',
          'cloud solutions',
          'DevOps services',
          'cybersecurity services',
        ]}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
        ])}
      />

      <Section spacing="none" className="pt-36 pb-14 sm:pt-44">
        <Container>
          <SectionHeading
            eyebrow="What We Build"
            title="Technology Services for Growing Businesses"
            lead="From a first product to scaling infrastructure — practical engineering, not just consulting."
          />
        </Container>
      </Section>

      <Section tone="default" spacing="none" className="pb-24">
        <Container>
          <StaggerGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <StaggerItem key={service.slug}>
                <Link
                  to={`/services/${service.slug}`}
                  className="group border-border-soft bg-surface hover:shadow-lifted focus-visible:ring-primary-dark flex h-full flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="bg-primary-soft text-primary-dark flex size-11 items-center justify-center rounded-xl">
                    <service.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-display text-ink text-lg font-bold">{service.title}</h3>
                    <p className="text-ink-muted text-body-sm mt-1.5">{service.shortDescription}</p>
                  </div>
                  <span className="text-primary-dark mt-auto inline-flex items-center gap-1.5 text-sm font-semibold">
                    Learn More
                    <ArrowRight
                      className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <div className="mt-14 flex flex-col items-center gap-4 text-center">
            <p className="text-ink-muted text-body-sm max-w-md">
              Have a project in mind? Tell us what you're building and we'll get back to you.
            </p>
            <Button href="/contact">Get in Touch</Button>
          </div>
        </Container>
      </Section>
    </>
  )
}
