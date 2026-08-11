import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { fadeUp, staggerContainer } from '@/components/motion/variants'

interface StaggerGroupProps {
  children: ReactNode
  className?: string
  once?: boolean
}

/** Container half of the stagger pair — wraps a set of `StaggerItem`s (e.g. a program grid, a step list) so they reveal in sequence rather than all at once. */
export function StaggerGroup({ children, className, once = true }: StaggerGroupProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-60px' }}
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const prefersReducedMotion = usePrefersReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  )
}
