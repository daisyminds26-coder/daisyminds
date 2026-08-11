import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/utils/cn'

export interface AccordionItemData {
  question: string
  answer: string
}

interface AccordionProps {
  items: AccordionItemData[]
  className?: string
  /** Lets more than one item stay open at once — off by default (classic FAQ behavior). */
  allowMultiple?: boolean
}

/**
 * A from-scratch accessible accordion (button + `aria-expanded` +
 * `role="region"`, WAI-ARIA disclosure pattern) rather than native
 * `<details>` — native elements can't animate height smoothly across
 * browsers, and this needs the same reveal polish as the rest of the site.
 */
export function Accordion({ items, className, allowMultiple = false }: AccordionProps) {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(new Set())
  const prefersReducedMotion = usePrefersReducedMotion()

  function toggle(index: number) {
    setOpenIndexes((previous) => {
      const next = allowMultiple ? new Set(previous) : new Set<number>()
      if (previous.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className={cn('divide-border-soft flex flex-col divide-y', className)}>
      {items.map((item, index) => (
        <AccordionRow
          key={item.question}
          item={item}
          isOpen={openIndexes.has(index)}
          onToggle={() => {
            toggle(index)
          }}
          prefersReducedMotion={prefersReducedMotion}
        />
      ))}
    </div>
  )
}

function AccordionRow({
  item,
  isOpen,
  onToggle,
  prefersReducedMotion,
}: {
  item: AccordionItemData
  isOpen: boolean
  onToggle: () => void
  prefersReducedMotion: boolean
}) {
  const panelId = useId()

  return (
    <div className="py-2">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="group flex w-full items-center justify-between gap-6 py-4 text-left"
        >
          <span className="text-ink text-base font-semibold sm:text-lg">{item.question}</span>
          <span
            className={cn(
              'bg-surface-raised text-ink border-border-soft flex size-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-300',
              isOpen && 'rotate-45',
            )}
            aria-hidden="true"
          >
            <Plus className="size-4" />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-ink-muted text-body-lg pr-12 pb-5">{item.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
