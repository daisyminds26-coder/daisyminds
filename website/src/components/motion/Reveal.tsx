import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { fadeUp } from '@/components/motion/variants'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  /** Runs once, the first time the element scrolls into view — never re-triggers on scroll-back, so re-reading a section is never interrupted by animation. */
  once?: boolean
  as?: 'div' | 'span'
}

/** The default scroll-reveal wrapper used across every marketing section. Renders children statically (no transform, no opacity dip) when the visitor prefers reduced motion. */
export function Reveal({ children, className, delay = 0, once = true, as = 'div' }: RevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  if (prefersReducedMotion) {
    const Static = as
    return <Static className={className}>{children}</Static>
  }

  const MotionTag = as === 'span' ? motion.span : motion.div

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-80px' }}
      variants={fadeUp}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  )
}
