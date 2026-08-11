import { Suspense, use, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Layers, MonitorSmartphone } from 'lucide-react'

import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Badge'
import { Reveal } from '@/components/motion/Reveal'
import { getProgramBySlug } from '@/data/programs'
import { buildBreadcrumbSchema, buildCourseSchema } from '@/utils/structured-data'

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
  const programPromise = useMemo(() => getProgramBySlug(slug), [slug])
  const program = use(programPromise)

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
        <p className="text-ink-muted">It may have moved, or the link may be out of date.</p>
        <Button href="/programs" variant="ghost" icon={<ArrowLeft className="size-4" />}>
          Back to all programs
        </Button>
      </Section>
    )
  }

  return (
    <>
      <Seo title={program.title} description={program.summary} path={`/programs/${program.slug}`} />
      <JsonLd data={buildCourseSchema(program)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Programs', path: '/programs' },
          { name: program.title, path: `/programs/${program.slug}` },
        ])}
      />

      <Section spacing="none" className="pt-36 pb-16 sm:pt-44">
        <Container>
          <Link
            to="/programs"
            className="text-ink-muted hover:text-ink mb-8 inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="size-4" />
            All programs
          </Link>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr]">
            <Reveal className="flex flex-col gap-6">
              <Eyebrow>{program.category}</Eyebrow>
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
                  {program.mode}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden="true" />
                  {program.durationLabel}
                </span>
              </div>
            </Reveal>

            <Reveal
              delay={0.1}
              className="border-border-soft bg-surface shadow-soft h-fit rounded-2xl border p-6"
            >
              <p className="text-ink-soft text-xs font-semibold tracking-wide uppercase">Outcome</p>
              <p className="text-ink mt-2 text-base font-semibold">{program.outcome}</p>
              <p className="text-ink-soft mt-5 text-xs font-semibold tracking-wide uppercase">
                Mentor support
              </p>
              <p className="text-ink-muted mt-2 text-sm">{program.mentorSupport}</p>
              <Button
                href={`/contact?program=${program.slug}`}
                className="mt-6 w-full"
                trailingIcon={<ArrowRight className="size-4" />}
              >
                Apply for this Program
              </Button>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="surface">
        <Container className="grid grid-cols-1 gap-14 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-display-sm text-ink mb-6">Curriculum</h2>
            <ol className="flex flex-col gap-4">
              {program.modules.map((module, index) => (
                <li
                  key={module.title}
                  className="border-border-soft flex gap-4 rounded-xl border bg-white p-4"
                >
                  <span className="text-primary-dark font-display shrink-0 text-lg font-bold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-ink font-semibold">{module.title}</p>
                    <p className="text-ink-muted text-body-sm mt-0.5">{module.summary}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="font-display text-display-sm text-ink mb-6">Skills you'll build</h2>
            <ul className="flex flex-wrap gap-2">
              {program.skills.map((skill) => (
                <li
                  key={skill}
                  className="border-border-soft text-ink-muted inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-sm font-medium"
                >
                  <CheckCircle2 className="text-success size-4" aria-hidden="true" />
                  {skill}
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </Section>

      <Section tone="charcoal" spacing="compact">
        <Container className="flex flex-col items-center gap-6 text-center">
          <h2 className="font-display text-display-sm max-w-lg text-balance text-white">
            Ready to start {program.title}?
          </h2>
          <Button
            href={`/contact?program=${program.slug}`}
            size="lg"
            trailingIcon={<ArrowRight className="size-4.5" />}
          >
            Apply Now
          </Button>
        </Container>
      </Section>
    </>
  )
}
