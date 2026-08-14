import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/utils/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

/**
 * The site's first modal primitive — used by `ServiceDetailPage.tsx` to
 * open the contact form in-page ("Get in Touch") instead of navigating to
 * `/contact`. Portaled to `document.body` (escapes any `overflow`/`z-index`
 * ancestor), closes on Escape and backdrop click, locks page scroll while
 * open, and moves focus into the dialog on open / back to the trigger on
 * close — the accessible-dialog basics, not a full focus-trap library.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerElementRef = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!open) return

    triggerElementRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      triggerElementRef.current?.focus()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
        >
          <div
            className="bg-charcoal/60 absolute inset-0 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'bg-background relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl outline-none sm:p-8',
              className,
            )}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="border-border-soft text-ink-muted hover:text-ink hover:border-ink/30 absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border transition-colors"
            >
              <X className="size-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
