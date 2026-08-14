import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { ProgramIcon } from '@/components/marketing/ProgramIcon'
import { getPrograms } from '@/data/programs'
import type { Program } from '@/types/program'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/utils/cn'

function groupByCategory(programs: Program[]): [string, Program[]][] {
  const groups = new Map<string, Program[]>()
  for (const program of programs) {
    const list = groups.get(program.category) ?? []
    list.push(program)
    groups.set(program.category, list)
  }
  return Array.from(groups.entries())
}

/**
 * Desktop "Services" nav item — opens a mega menu listing every program
 * from `data/programs.ts`, grouped by category, instead of navigating
 * straight to `/services`. Supports hover, click, and keyboard (focus +
 * Escape) — never relies on CSS `:hover` alone.
 */
export function ServicesMegaMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const [programs, setPrograms] = useState<Program[]>([])
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    let active = true
    void getPrograms().then((data) => {
      if (active) setPrograms(data)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function openNow() {
    window.clearTimeout(closeTimer.current)
    setIsOpen(true)
  }

  function closeSoon() {
    closeTimer.current = window.setTimeout(() => {
      setIsOpen(false)
    }, 120)
  }

  const groups = groupByCategory(programs)

  return (
    <div ref={containerRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm font-medium transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => {
          setIsOpen((open) => !open)
        }}
      >
        Services
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="border-border-soft bg-background shadow-lifted absolute top-full left-1/2 z-50 mt-3 w-[min(48rem,90vw)] -translate-x-1/2 rounded-2xl border p-6"
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map(([category, items]) => (
                <div key={category} className="flex flex-col gap-3">
                  <p className="text-eyebrow text-ink-soft font-semibold tracking-wide uppercase">
                    {category}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {items.map((program) => (
                      <li key={program.slug}>
                        <Link
                          to={`/services/${program.slug}`}
                          className="hover:bg-surface-raised text-ink group flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors"
                        >
                          <span className="bg-primary-soft text-primary-dark flex size-8 shrink-0 items-center justify-center rounded-full">
                            <ProgramIcon name={program.icon} className="size-4" />
                          </span>
                          {program.shortTitle}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-border-soft mt-5 border-t pt-4">
              <Link
                to="/services"
                className="text-primary-dark inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              >
                View all programs →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
