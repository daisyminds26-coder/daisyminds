import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'outline-light' | 'ghost' | 'link'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-[0_1px_0_0_rgb(0_0_0/0.05)] hover:bg-primary-dark',
  secondary: 'bg-charcoal text-white hover:bg-charcoal-soft',
  'outline-light': 'border border-white/30 text-white hover:border-white/60 hover:bg-white/10',
  ghost: 'border border-border text-foreground hover:border-ink/30 hover:bg-surface',
  link: 'text-foreground underline-offset-4 hover:underline px-0 py-0 h-auto',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-12 px-6 text-[0.9375rem] gap-2',
  lg: 'h-14 px-8 text-base gap-2.5',
}

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  icon?: ReactNode
  trailingIcon?: ReactNode
}

interface ButtonAsButton
  extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  href?: undefined
  children: ReactNode
}

interface ButtonAsLink extends CommonProps {
  href: string
  external?: boolean
  target?: string
  rel?: string
  children: ReactNode
}

export type ButtonProps = ButtonAsButton | ButtonAsLink

const baseClasses = cn(
  'inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap',
  'transition-[transform,background-color,border-color,color] duration-200 ease-out',
  'hover:scale-[1.015] active:scale-[0.98]',
  'motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'disabled:pointer-events-none disabled:opacity-50',
)

/**
 * The one CTA primitive for the whole site. Internal links render through
 * `react-router-dom`'s `Link` (no full reload); external links get
 * `target=_blank` + `rel=noreferrer` automatically; everything else is a
 * real `<button>`. The hover/tap scale is a plain CSS transform (not
 * Framer Motion) — cheaper for something rendered this many times per page,
 * and `motion-reduce:` handles the reduced-motion case without a hook.
 */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', className, children, icon, trailingIcon, ...rest },
    ref,
  ) {
    const classes = cn(
      baseClasses,
      VARIANT_CLASSES[variant],
      variant !== 'link' && SIZE_CLASSES[size],
      className,
    )

    if ('href' in rest && rest.href !== undefined) {
      const { href, external, target, rel, ...anchorRest } = rest
      const isExternal = external ?? /^https?:\/\//.test(href)

      if (isExternal) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            target={target ?? '_blank'}
            rel={rel ?? 'noreferrer'}
            className={classes}
            {...anchorRest}
          >
            {icon}
            {children}
            {trailingIcon}
          </a>
        )
      }

      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          to={href}
          className={classes}
          {...anchorRest}
        >
          {icon}
          {children}
          {trailingIcon}
        </Link>
      )
    }

    const { type = 'button', ...buttonRest } = rest as ButtonAsButton

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        className={classes}
        {...buttonRest}
      >
        {icon}
        {children}
        {trailingIcon}
      </button>
    )
  },
)
