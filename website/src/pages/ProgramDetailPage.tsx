import { Suspense, use, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Layers,
  MessagesSquare,
  MonitorSmartphone,
  Wrench,
} from 'lucide-react'

import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Badge, Eyebrow } from '@/components/ui/Badge'
import { Accordion } from '@/components/ui/Accordion'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { Reveal } from '@/components/motion/Reveal'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import { PlanCard } from '@/components/marketing/PlanCard'
import { getProgramBySlug } from '@/data/programs'
import { getPlans } from '@/data/plans'
import { WHY_DAISY_MINDS_REASONS } from '@/data/why-daisy-minds'
import { buildBreadcrumbSchema, buildCourseSchema } from '@/utils/structured-data'
import type { Plan } from '@/types/plan'
import type { Program } from '@/types/program'

export default function ProgramDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()

  return (
    <Suspense key={slug} fallback={<Section spacing="none" className="min-h-[70vh] pt-36" />}>
      <ProgramDetailContent slug={slug} />
    </Suspense>
  )
}

function ProgramDetailContent({ slug }: { slug: string }) {
  // Re-created only when `slug` changes; the parent `<Suspense key={slug}>`
  // remounts this subtree on that change, so `use()` never sees a stale
  // promise for the previous program.
  const dataPromise = useMemo<Promise<[Program | undefined, Plan[]]>>(
    () => Promise.all([getProgramBySlug(slug), getPlans()]),
    [slug],
  )
  const [program, plans] = use(dataPromise)

  if (!program) {
    return (
      <Section
        spacing="none"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 pt-36 text-center"
      >
        <Seo
          title="Program Not Found"
          description="This program could not be found."
          path={`/services/${slug}`}
          noIndex
        />
        <h1 className="font-display text-display-sm text-ink">We couldn't find that program</h1>
        <p className="text-ink-muted">It may have moved, or the link may be out of date.</p>
        <Button href="/services" variant="ghost" icon={<ArrowLeft className="size-4" />}>
          Back to all services
        </Button>
      </Section>
    )
  }

  const applyHref = `/apply?program=${program.slug}`
  const advisorHref = `/contact?program=${program.slug}`

  return (
    <>
      <Seo
        title={program.seo.title}
        description={program.seo.description}
        path={`/services/${program.slug}`}
      />
      <JsonLd data={buildCourseSchema(program)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
          { name: program.title, path: `/services/${program.slug}` },
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
              <Badge tone="primary" className="w-fit">
                {program.category}
              </Badge>
              <h1 className="font-display text-display-lg text-ink text-balance">
                {program.title}
              </h1>
              <p className="text-lead text-ink-muted">{program.description}</p>

              <div className="text-ink-soft flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="size-4" aria-hidden="true" />
                  {program.level}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MonitorSmartphone className="size-4" aria-hidden="true" />
                  {program.learningMode}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden="true" />
                  {program.duration}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  href={applyHref}
                  size="lg"
                  trailingIcon={<ArrowRight className="size-4.5" />}
                >
                  Apply for Program
                </Button>
                <Button href={advisorHref} variant="ghost" size="lg">
                  Talk to Advisor
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <ResponsiveImage
                src={program.heroImage.src}
                alt={program.heroImage.alt}
                aspectRatio="4/3"
                priority
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="rounded-3xl shadow-[0_30px_60px_-20px_rgb(33_29_25/0.25)]"
              />
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* 2. Overview */}
      <Section tone="surface">
        <Container>
          <SectionHeading eyebrow="Overview" title={`What ${program.shortTitle} Is About`} />
          <StaggerGroup className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StaggerItem>
              <OverviewCard title="What It Is" body={program.shortDescription} />
            </StaggerItem>
            <StaggerItem>
              <OverviewCard
                title="Who It's For"
                body={`${program.level} learners ready to build practical, job-ready ${program.category.toLowerCase()} skills.`}
              />
            </StaggerItem>
            <StaggerItem>
              <OverviewCard
                title="What You Gain"
                body="Hands-on projects, mentor feedback, and a portfolio you can show employers."
              />
            </StaggerItem>
          </StaggerGroup>
        </Container>
      </Section>

      {/* 3. What You Will Learn */}
      <Section tone="default">
        <Container>
          <SectionHeading eyebrow="Curriculum" title="What You Will Learn" />
          <StaggerGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {program.whatYouWillLearn.map((item) => (
              <StaggerItem key={item.title}>
                <div className="border-border-soft bg-surface flex h-full flex-col gap-2.5 rounded-2xl border p-5">
                  <CheckCircle2 className="text-success size-5 shrink-0" aria-hidden="true" />
                  <p className="text-ink font-semibold">{item.title}</p>
                  <p className="text-ink-muted text-body-sm">{item.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      {/* 4. Curriculum Highlights */}
      <Section tone="tint">
        <Container>
          <SectionHeading
            eyebrow="Curriculum Highlights"
            title="Major learning areas covered"
            lead="A high-level view of what the program covers — the full lesson-by-lesson curriculum is shared during onboarding."
          />
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {program.curriculumHighlights.map((area, index) => (
              <Reveal key={area.title} delay={index * 0.06}>
                <div className="border-border-soft bg-surface flex gap-4 rounded-xl border p-5">
                  <span className="text-primary-dark font-display shrink-0 text-lg font-bold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-ink font-semibold">{area.title}</p>
                    <p className="text-ink-muted text-body-sm mt-0.5">{area.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* 5. Tools & Technologies */}
      <Section tone="default">
        <Container>
          <SectionHeading eyebrow="Tools & Technologies" title="What you'll work with" />
          <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-3">
            {program.tools.map((tool) => (
              <span
                key={tool}
                className="border-border-soft bg-surface text-ink inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
              >
                <Wrench className="text-primary-dark size-4" aria-hidden="true" />
                {tool}
              </span>
            ))}
          </Reveal>
        </Container>
      </Section>

      {/* 6. Hands-on Learning */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow="Hands-on Learning"
            title="Projects, practice, and mentor guidance"
            lead={program.mentorSupport}
          />
          <StaggerGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {program.projects.map((project) => (
              <StaggerItem key={project.title}>
                <div className="border-border-soft bg-background flex h-full flex-col gap-2.5 rounded-2xl border p-5">
                  <MessagesSquare
                    className="text-primary-dark size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-ink font-semibold">{project.title}</p>
                  <p className="text-ink-muted text-body-sm">{project.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      {/* 7. Career Opportunities */}
      <Section tone="default">
        <Container>
          <SectionHeading
            eyebrow="Career Opportunities"
            title="Where this program can take you"
            lead="Example roles graduates commonly pursue — not a guarantee of employment or outcome."
          />
          <StaggerGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {program.careerOpportunities.map((role) => (
              <StaggerItem key={role.title}>
                <div className="border-border-soft bg-surface flex h-full flex-col gap-2.5 rounded-2xl border p-5">
                  <Briefcase className="text-primary-dark size-5 shrink-0" aria-hidden="true" />
                  <p className="text-ink font-semibold">{role.title}</p>
                  <p className="text-ink-muted text-body-sm">{role.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      {/* 8. Why Learn at Daisy Minds */}
      <Section tone="tint">
        <Container>
          <SectionHeading
            eyebrow="Why Daisy Minds"
            title="Why Learn at Daisy Minds"
            align="center"
            className="mx-auto items-center text-center"
          />
          <StaggerGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_DAISY_MINDS_REASONS.map((reason) => (
              <StaggerItem key={reason.title}>
                <div className="border-border-soft bg-surface shadow-soft flex h-full flex-col gap-3 rounded-2xl border p-6">
                  <span className="bg-primary-soft text-primary-dark flex size-11 items-center justify-center rounded-xl">
                    <reason.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-ink text-base font-bold">{reason.title}</h3>
                  <p className="text-ink-muted text-body-sm">{reason.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      {/* 9. Choose Your Learning Path */}
      <Section tone="default">
        <Container>
          <SectionHeading
            eyebrow="Pricing"
            title="Choose Your Learning Path"
            lead="Pick the plan that fits your goals and timeline for this program."
            align="center"
            className="mx-auto items-center text-center"
          />
          <StaggerGroup className="mt-12 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <StaggerItem key={plan.id}>
                <PlanCard plan={plan} programSlug={program.slug} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      {/* 10. FAQ */}
      <Section tone="surface">
        <Container size="narrow">
          <SectionHeading
            eyebrow="FAQ"
            title={`Questions about ${program.shortTitle}`}
            align="center"
            className="mx-auto items-center text-center"
          />
          <Reveal
            delay={0.1}
            className="bg-background border-border-soft mt-10 rounded-2xl border px-6 sm:px-10"
          >
            <Accordion items={program.faq} />
          </Reveal>
        </Container>
      </Section>

      {/* 11. Final CTA */}
      <Section tone="charcoal" spacing="compact" grid>
        <Container className="flex flex-col items-center gap-6 text-center">
          <Reveal>
            <Eyebrow tone="light">{program.title}</Eyebrow>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="font-display text-display-lg max-w-2xl text-balance text-white">
              {program.cta.heading}
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="text-lead max-w-lg text-white/70">{program.cta.description}</p>
          </Reveal>
          <Reveal delay={0.18} className="flex flex-wrap items-center justify-center gap-3">
            <Button href={applyHref} size="lg" trailingIcon={<ArrowRight className="size-4.5" />}>
              Apply for Program
            </Button>
            <Button href={advisorHref} variant="outline-light" size="lg">
              Talk to Advisor
            </Button>
          </Reveal>
        </Container>
      </Section>

      {/* Tasteful sticky mobile Apply CTA — program pages only, out of the way on desktop. */}
      <div className="bg-background/95 border-border-soft fixed inset-x-0 bottom-0 z-40 border-t p-3 backdrop-blur-sm sm:hidden">
        <Button
          href={applyHref}
          className="w-full"
          size="lg"
          trailingIcon={<ArrowRight className="size-4.5" />}
        >
          Apply for Program
        </Button>
      </div>
      <div className="h-20 sm:hidden" aria-hidden="true" />
    </>
  )
}

function OverviewCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-border-soft bg-background flex h-full flex-col gap-2 rounded-2xl border p-6">
      <p className="text-primary-dark text-xs font-semibold tracking-wide uppercase">{title}</p>
      <p className="text-ink text-body-sm">{body}</p>
    </div>
  )
}
