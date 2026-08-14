import { Suspense, use, useMemo, useState } from 'react'

import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ProgramCard } from '@/components/marketing/ProgramCard'
import { ProgramCardSkeletonGrid } from '@/components/marketing/ProgramCardSkeleton'
import { ProgramsErrorBoundary } from '@/components/error/ProgramsErrorBoundary'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import { cn } from '@/utils/cn'
import { getPrograms } from '@/services/public-programs-service'
import { buildBreadcrumbSchema } from '@/utils/structured-data'
import {
  PROGRAM_LEVELS,
  PROGRAM_DELIVERY_MODES,
  formatEnumLabel,
  type ProgramLevel,
  type ProgramDeliveryMode,
} from '@/types/program'

const ALL = 'All'

/**
 * Student training programs, dynamically loaded from Course Management via
 * `GET /api/v1/public/programs` — this file replaces what used to be a
 * hardcoded `data/programs.ts` import. For Daisy Minds' client-facing
 * technology services, see `ServicesPage.tsx` (`/services`, static) — a
 * deliberately separate section.
 */
export default function ProgramsPage() {
  const [retryCount, setRetryCount] = useState(0)

  return (
    <>
      <Seo
        title="Programs"
        description="Industry-oriented training, expert mentorship and hands-on learning designed to help you build practical, job-ready skills."
        path="/programs"
        keywords={[
          'training programs',
          'career programs',
          'technology courses',
          'job-ready skills',
          'mentor-led training',
          'Daisy Minds programs',
        ]}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Programs', path: '/programs' },
        ])}
      />

      <Section spacing="none" className="pt-36 pb-14 sm:pt-44">
        <Container>
          <SectionHeading
            eyebrow="What We Offer"
            title="Build Skills That Move Your Career Forward"
            lead="Industry-oriented training, expert mentorship and hands-on learning designed to help you build practical, job-ready skills."
          />
        </Container>
      </Section>

      <Section tone="default" spacing="none" className="pb-24">
        <Container>
          <ProgramsErrorBoundary
            onRetry={() => {
              setRetryCount((count) => count + 1)
            }}
          >
            <Suspense key={retryCount} fallback={<ProgramsPageSkeleton />}>
              <ProgramsListing />
            </Suspense>
          </ProgramsErrorBoundary>
        </Container>
      </Section>
    </>
  )
}

function ProgramsPageSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <div className="bg-surface-raised h-16 w-full max-w-md animate-pulse rounded-xl" />
      <ProgramCardSkeletonGrid />
    </div>
  )
}

function ProgramsListing() {
  const programsPromise = useMemo(() => getPrograms(), [])
  const programs = use(programsPromise)

  const [category, setCategory] = useState<string>(ALL)
  const [level, setLevel] = useState<ProgramLevel | typeof ALL>(ALL)
  const [deliveryMode, setDeliveryMode] = useState<ProgramDeliveryMode | typeof ALL>(ALL)

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(programs.map((program) => program.category)))],
    [programs],
  )

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      if (category !== ALL && program.category !== category) return false
      if (level !== ALL && program.level !== level) return false
      if (deliveryMode !== ALL && program.deliveryMode !== deliveryMode) return false
      return true
    })
  }, [programs, category, level, deliveryMode])

  if (programs.length === 0) {
    return (
      <p className="text-ink-muted py-16 text-center">
        No programs are published yet — check back soon.
      </p>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <FilterRow label="Category" value={category} options={categories} onChange={setCategory} />
        <div className="flex flex-wrap gap-6">
          <FilterRow
            label="Level"
            value={level}
            options={[ALL, ...PROGRAM_LEVELS]}
            formatOption={(option) => (option === ALL ? ALL : formatEnumLabel(option))}
            onChange={(value) => {
              setLevel(value as ProgramLevel | typeof ALL)
            }}
            compact
          />
          <FilterRow
            label="Mode"
            value={deliveryMode}
            options={[ALL, ...PROGRAM_DELIVERY_MODES]}
            formatOption={(option) => (option === ALL ? ALL : formatEnumLabel(option))}
            onChange={(value) => {
              setDeliveryMode(value as ProgramDeliveryMode | typeof ALL)
            }}
            compact
          />
        </div>
      </div>

      <div className="mt-10">
        {filteredPrograms.length === 0 ? (
          <p className="text-ink-muted py-16 text-center">
            No programs match these filters yet — try a different combination.
          </p>
        ) : (
          <StaggerGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPrograms.map((program) => (
              <StaggerItem key={program.slug}>
                <ProgramCard program={program} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>
    </>
  )
}

function FilterRow({
  label,
  value,
  options,
  onChange,
  formatOption = (option) => option,
  compact = false,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  formatOption?: (option: string) => string
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-2', compact && 'min-w-[12rem] flex-1')}>
      <span className="text-ink-soft text-xs font-semibold tracking-wide uppercase">{label}</span>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={`Filter by ${label.toLowerCase()}`}
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => {
              onChange(option)
            }}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              value === option
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border-soft text-ink-muted hover:border-ink/30',
            )}
          >
            {formatOption(option)}
          </button>
        ))}
      </div>
    </div>
  )
}
