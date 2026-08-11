import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface FloatingCardProps {
  children: ReactNode
  className?: string
  /** Vertical drift distance in px. */
  distance?: number
  /** Full up-down-up cycle length, in seconds. */
  duration?: number
  delay?: number
}

/** A slow, continuous vertical drift used for the hero's overlapping product-mockup cards — the "cinematic yet lightweight" ambient motion the design brief asks for. Never animates for reduced-motion visitors. */
export function FloatingCard({
  children,
  className,
  distance = 10,
  duration = 5,
  delay = 0,
}: FloatingCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}
