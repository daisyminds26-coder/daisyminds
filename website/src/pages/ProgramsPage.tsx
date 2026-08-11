import { use, useMemo, useState } from 'react'

import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ProgramCard } from '@/components/marketing/ProgramCard'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import { cn } from '@/utils/cn'
import { getPrograms } from '@/data/programs'
import { PROGRAM_LEVELS, PROGRAM_MODES, type ProgramLevel, type ProgramMode } from '@/types/program'

const ALL = 'All'

/** Module-scope — this page module is only ever imported once via `React.lazy`, so `use()` always sees a stable promise reference. */
const programsPromise = getPrograms()

export default function ProgramsPage() {
  const programs = use(programsPromise)
  const [category, setCategory] = useState<string>(ALL)
  const [level, setLevel] = useState<ProgramLevel | typeof ALL>(ALL)
  const [mode, setMode] = useState<ProgramMode | typeof ALL>(ALL)

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(programs.map((program) => program.category)))],
    [programs],
  )

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      if (category !== ALL && program.category !== category) return false
      if (level !== ALL && program.level !== level) return false
      if (mode !== ALL && program.mode !== mode) return false
      return true
    })
  }, [programs, category, level, mode])

  return (
    <>
      <Seo
        title="Programs"
        description="Explore Daisy Minds' mentor-led programs in software development, data science, product design, cloud engineering, marketing, and security."
        path="/programs"
      />

      <Section spacing="none" className="pt-36 pb-14 sm:pt-44">
        <Container>
          <SectionHeading
            eyebrow="All Programs"
            title="Find the program built for where you want to go."
            lead="Every program is mentor-led, project-based, and scoped around a real hiring outcome."
          />

          <div className="mt-10 flex flex-col gap-4">
            <FilterRow
              label="Category"
              value={category}
              options={categories}
              onChange={setCategory}
            />
            <div className="flex flex-wrap gap-6">
              <FilterRow
                label="Level"
                value={level}
                options={[ALL, ...PROGRAM_LEVELS]}
                onChange={(value) => {
                  setLevel(value as ProgramLevel | typeof ALL)
                }}
                compact
              />
              <FilterRow
                label="Mode"
                value={mode}
                options={[ALL, ...PROGRAM_MODES]}
                onChange={(value) => {
                  setMode(value as ProgramMode | typeof ALL)
                }}
                compact
              />
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="default" spacing="none" className="pb-24">
        <Container>
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
        </Container>
      </Section>
    </>
  )
}

function FilterRow({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
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
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
