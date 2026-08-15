import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb'
import { useBreadcrumbStore } from '@/shared/stores/breadcrumb-store'

export interface BreadcrumbSegment {
  label: string
  href?: string
}

function humanize(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Auto-derives crumbs from the URL when `segments` isn't supplied (each path
 * segment title-cased). A page can override this — e.g. a resource name
 * instead of its id — via `usePageBreadcrumb`, which stores an explicit
 * trail in `useBreadcrumbStore`; that takes precedence over auto-derivation
 * whenever no `segments` prop is passed directly.
 */
export function PageBreadcrumb({ segments }: { segments?: readonly BreadcrumbSegment[] }) {
  const location = useLocation()
  const storeSegments = useBreadcrumbStore((state) => state.segments)

  const crumbs =
    segments ??
    storeSegments ??
    location.pathname
      .split('/')
      .filter(Boolean)
      .map((segment, index, all) => ({
        label: humanize(segment),
        href: index < all.length - 1 ? `/${all.slice(0, index + 1).join('/')}` : undefined,
      }))

  if (crumbs.length === 0) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index.toString()}`}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
