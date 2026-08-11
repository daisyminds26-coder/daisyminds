import type { SVGProps } from 'react'

/**
 * `lucide-react` ships no brand/social marks in this project's version — these are small, monochrome (`currentColor`) stand-ins so the footer's real social links (Facebook/LinkedIn/Instagram) have a recognizable icon instead of a generic placeholder.
 */

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path
        d="M14 9h3V6h-3c-1.66 0-3 1.34-3 3v2H9v3h2v6h3v-6h3l1-3h-4v-2c0-.55.45-1 1-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 10.5v6M7.5 7.5v.01M11.5 16.5v-3.5c0-1.1.9-2 2-2s2 .9 2 2v3.5M11.5 10.5v6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}
