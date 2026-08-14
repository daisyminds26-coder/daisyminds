import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { SERVICES } from '@/data/services'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/utils/cn'

/**
 * Desktop "Services" nav item — opens a mega menu listing all of Daisy
 * Minds' client-facing services. Mirrors `ProgramsMegaMenu.tsx`'s
 * hover/click/keyboard(Escape)/click-outside behavior, but simpler: a flat
 * list (no category grouping needed for 9 static items) and no fetch/
 * loading state (`SERVICES` is synchronous local data, unlike Programs).
 */
export function ServicesMegaMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const prefersReducedMotion = usePrefersReducedMotion()

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
            className="border-border-soft bg-background shadow-lifted absolute top-full left-1/2 z-50 mt-3 w-[min(40rem,90vw)] -translate-x-1/2 rounded-2xl border p-6"
          >
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {SERVICES.map((service) => (
                <li key={service.slug}>
                  <Link
                    to={`/services/${service.slug}`}
                    className="hover:bg-surface-raised text-ink group flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors"
                  >
                    <span className="bg-primary-soft text-primary-dark flex size-8 shrink-0 items-center justify-center rounded-full">
                      <service.icon className="size-4" aria-hidden="true" />
                    </span>
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-border-soft mt-5 border-t pt-4">
              <Link
                to="/services"
                className="text-primary-dark inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              >
                View all services →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
