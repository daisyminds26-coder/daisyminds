import type { ReactNode } from 'react'

import { Reveal } from '@/components/motion/Reveal'
import { Eyebrow } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

interface SectionHeadingProps {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  align?: 'left' | 'center'
  tone?: 'default' | 'light'
  className?: string
  titleClassName?: string
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  tone = 'default',
  className,
  titleClassName,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow && <Eyebrow tone={tone === 'light' ? 'light' : 'primary'}>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          'text-display-md font-display max-w-2xl text-balance',
          tone === 'light' ? 'text-white' : 'text-ink',
          titleClassName,
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            'text-lead max-w-xl',
            tone === 'light' ? 'text-white/70' : 'text-ink-muted',
          )}
        >
          {lead}
        </p>
      )}
    </Reveal>
  )
}
