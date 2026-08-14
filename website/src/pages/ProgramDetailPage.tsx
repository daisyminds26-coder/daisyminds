import { Suspense, use, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  FileText,
  HelpCircle,
  Layers,
  LinkIcon,
  MonitorSmartphone,
  Users,
  Video,
} from 'lucide-react'

import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Badge, Eyebrow } from '@/components/ui/Badge'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { Reveal } from '@/components/motion/Reveal'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import { PlanCard } from '@/components/marketing/PlanCard'
import { ProgramImageFallback } from '@/components/marketing/ProgramImageFallback'
import { ProgramsErrorBoundary } from '@/components/error/ProgramsErrorBoundary'
import { getProgramBySlug } from '@/services/public-programs-service'
import { getPlans } from '@/data/plans'
import { WHY_DAISY_MINDS_REASONS } from '@/data/why-daisy-minds'
import { buildBreadcrumbSchema, buildCourseSchema } from '@/utils/structured-data'
import { formatEnumLabel, type Program, type BatchAvailability } from '@/types/program'
import type { Plan } from '@/types/plan'

const LESSON_TYPE_ICONS: Record<string, typeof Video> = {
  VIDEO: Video,
  TEXT: FileText,
  DOCUMENT: FileText,
  LIVE_CLASS: Users,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardCheck,
  EXTERNAL_LINK: LinkIcon,
}

const AVAILABILITY_STYLES: Record<BatchAvailability, string> = {
  AVAILABLE: 'text-success bg-success/10',
  LIMITED: 'text-warning bg-warning/10',
  FULL: 'text-danger bg-danger/10',
}

const AVAILABILITY_LABELS: Record<BatchAvailability, string> = {
  AVAILABLE: 'Seats Available',
  LIMITED: 'Limited Seats',
  FULL: 'Full',
}

export default function ProgramDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [retryCount, setRetryCount] = useState(0)

  return (
    <ProgramsErrorBoundary
      onRetry={() => {
        setRetryCount((count) => count + 1)
      }}
    >
      <Suspense
        key={`${slug}-${String(retryCount)}`}
        fallback={<Section spacing="none" className="min-h-[70vh] pt-36" />}
      >
        <ProgramDetailContent slug={slug} />
      </Suspense>
    </ProgramsErrorBoundary>
  )
}

function ProgramDetailContent({ slug }: { slug: string }) {
  // Re-created only when `slug` changes; the parent `<Suspense key>` above
  // includes `slug`, so `use()` never sees a stale promise for the previous
  // program.
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
          path={`/programs/${slug}`}
          noIndex
        />
        <h1 className="font-display text-display-sm text-ink">We couldn't find that program</h1>
        <p className="text-ink-muted">
          It may have been unpublished, or the link may be out of date.
        </p>
        <Button href="/programs" variant="ghost" icon={<ArrowLeft className="size-4" />}>
          Back to all programs
        </Button>
      </Section>
    )
  }

  const applyHref = `/apply?program=${program.slug}`
  const advisorHref = `/contact?program=${program.slug}`
  const heroImageUrl = program.bannerUrl ?? program.thumbnailUrl

  return (
    <>
      <Seo
        title={program.seo.title}
        description={program.seo.description}
        path={`/programs/${program.slug}`}
        keywords={[program.title, program.category, ...program.skills, 'Daisy Minds']}
        image={program.thumbnailUrl ?? undefined}
      />
      <JsonLd data={buildCourseSchema(program)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Programs', path: '/programs' },
          { name: program.title, path: `/programs/${program.slug}` },
        ])}
      />

      {/* 1. Hero */}
      <Section spacing="none" className="pt-36 pb-16 sm:pt-44">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-1.5 text-sm">
            <Link
              to="/programs"
              className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="size-4" />
              All Programs
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
                  {formatEnumLabel(program.level)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MonitorSmartphone className="size-4" aria-hidden="true" />
                  {formatEnumLabel(program.deliveryMode)}
                </span>
                {program.duration && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" aria-hidden="true" />
                    {program.duration}
                  </span>
                )}
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
              {heroImageUrl ? (
                <ResponsiveImage
                  src={heroImageUrl}
                  alt={program.title}
                  aspectRatio="4/3"
                  priority
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="rounded-3xl shadow-[0_30px_60px_-20px_rgb(33_29_25/0.25)]"
                />
              ) : (
                <ProgramImageFallback
                  aspectRatio="4/3"
                  className="rounded-3xl shadow-[0_30px_60px_-20px_rgb(33_29_25/0.25)]"
                />
              )}
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* 2. Overview */}
      <Section tone="surface">
        <Container>
          <SectionHeading eyebrow="Overview" title={`What ${program.title} Is About`} />
          <StaggerGroup className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StaggerItem>
              <OverviewCard title="What It Is" body={program.shortDescription} />
            </StaggerItem>
            <StaggerItem>
              <OverviewCard
                title="Who It's For"
                body={`${formatEnumLabel(program.level)} learners ready to build practical, job-ready ${program.category.toLowerCase()} skills.`}
              />
            </StaggerItem>
            <StaggerItem>
              <OverviewCard
                title="What You Gain"
                body="Hands-on projects, mentor feedback, and a portfolio you can show employers."
              />
            </StaggerItem>
          </StaggerGroup>

          {program.learningOutcomes.length > 0 && (
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {program.learningOutcomes.map((outcome) => (
                <div key={outcome} className="flex items-start gap-3">
                  <CheckCircle2
                    className="text-success mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-ink-muted text-body-sm">{outcome}</p>
                </div>
              ))}
            </div>
          )}

          {program.skills.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {program.skills.map((skill) => (
                <span
                  key={skill}
                  className="border-border-soft bg-surface text-ink inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* 3. Curriculum — real published modules/lessons, only if the course has any. */}
      {program.curriculum.length > 0 && (
        <Section tone="default">
          <Container>
            <SectionHeading
              eyebrow="Curriculum"
              title="What You'll Study"
              lead="A module-by-module view of the published curriculum."
            />
            <div className="mt-10 flex flex-col gap-4">
              {program.curriculum.map((courseModule) => (
                <Reveal
                  key={courseModule.id}
                  className="border-border-soft bg-surface rounded-2xl border p-6"
                >
                  <div className="flex items-start gap-3">
                    <BookOpen
                      className="text-primary-dark mt-0.5 size-5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="flex-1">
                      <h3 className="text-ink font-semibold">{courseModule.title}</h3>
                      {courseModule.description && (
                        <p className="text-ink-muted text-body-sm mt-1">
                          {courseModule.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {courseModule.lessons.length > 0 && (
                    <ul className="mt-4 flex flex-col gap-2 pl-8">
                      {courseModule.lessons.map((lesson) => {
                        const LessonIcon = LESSON_TYPE_ICONS[lesson.lessonType] ?? FileText
                        return (
                          <li
                            key={lesson.id}
                            className="text-ink-muted flex items-center gap-2.5 text-sm"
                          >
                            <LessonIcon className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="flex-1">{lesson.title}</span>
                            {lesson.estimatedDurationMinutes && (
                              <span className="text-ink-soft text-xs">
                                {lesson.estimatedDurationMinutes} min
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </Reveal>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* 4. Upcoming Batches — only if any are scheduled. */}
      {program.upcomingBatches.length > 0 && (
        <Section tone="tint">
          <Container>
            <SectionHeading
              eyebrow="Upcoming Batches"
              title="Start Dates for This Program"
              lead="Availability shown reflects real, current Enrollment — never an estimate."
            />
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {program.upcomingBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="border-border-soft bg-surface rounded-2xl border p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-ink font-semibold">{batch.name}</p>
                      <p className="text-ink-soft text-xs">{batch.batchCode}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${AVAILABILITY_STYLES[batch.availability]}`}
                    >
                      {AVAILABILITY_LABELS[batch.availability]}
                    </span>
                  </div>
                  <div className="text-ink-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                    {batch.startDate && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        Starts{' '}
                        {new Date(batch.startDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <MonitorSmartphone className="size-3.5" aria-hidden="true" />
                      {formatEnumLabel(batch.deliveryMode)}
                    </span>
                  </div>
                  {batch.weeklyScheduleSummary.length > 0 && (
                    <p className="text-ink-soft mt-2 text-xs">
                      {batch.weeklyScheduleSummary.join(' · ')} ({batch.timezone})
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* 5. Why Learn at Daisy Minds */}
      <Section tone="surface">
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

      {/* 6. Choose Your Learning Path */}
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

      {/* 7. Final CTA */}
      <Section tone="charcoal" spacing="compact" grid>
        <Container className="flex flex-col items-center gap-6 text-center">
          <Reveal>
            <Eyebrow tone="light">{program.title}</Eyebrow>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="font-display text-display-lg max-w-2xl text-balance text-white">
              Ready to start {program.title}?
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="text-lead max-w-lg text-white/70">
              Apply now or talk to an advisor to plan your next intake.
            </p>
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
