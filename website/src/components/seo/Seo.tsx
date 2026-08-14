import { useEffect } from 'react'

import { SITE_URL } from '@/utils/env'

interface SeoProps {
  title: string
  description: string
  /** Path only, e.g. `/programs/full-stack-web-development` — combined with `VITE_SITE_URL` for the canonical/OG URL. */
  path: string
  type?: 'website' | 'article'
  noIndex?: boolean
  /**
   * A short, specific list of terms this exact page is actually about — not
   * a stuffed list of every term the site could rank for. Modern search
   * engines (Google, Bing) give the `keywords` meta tag effectively no
   * ranking weight — it's included because it was explicitly requested and
   * costs nothing, not because it moves rankings. Real on-page relevance
   * (title/description/headings/content) does the actual work.
   */
  keywords?: string[]
  /** Absolute URL. Falls back to the site's default OG cover when a page has no specific image of its own. */
  image?: string
}

const SITE_NAME = 'Daisy Minds'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.png`

function setMetaTag(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function removeMetaTag(attribute: 'name' | 'property', key: string): void {
  document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)?.remove()
}

function setLinkTag(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

/**
 * A dependency-free document-head manager (no `react-helmet`) — every
 * public route renders exactly one of these. Title/description/canonical/
 * Open Graph/Twitter tags are all first-class here, per this site's own
 * "SEO is a first-class requirement" mandate. Structured data (JSON-LD)
 * is a separate `<JsonLd>` component, composed alongside this one.
 */
export function Seo({
  title,
  description,
  path,
  type = 'website',
  noIndex = false,
  keywords,
  image,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = `${title} | ${SITE_NAME}`
    const canonicalUrl = `${SITE_URL}${path}`
    const ogImage = image ?? DEFAULT_OG_IMAGE

    document.title = fullTitle
    setMetaTag('name', 'description', description)
    setMetaTag('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow')
    setLinkTag('canonical', canonicalUrl)

    if (keywords && keywords.length > 0) {
      setMetaTag('name', 'keywords', keywords.join(', '))
    } else {
      removeMetaTag('name', 'keywords')
    }

    setMetaTag('property', 'og:title', fullTitle)
    setMetaTag('property', 'og:description', description)
    setMetaTag('property', 'og:url', canonicalUrl)
    setMetaTag('property', 'og:type', type)
    setMetaTag('property', 'og:site_name', SITE_NAME)
    setMetaTag('property', 'og:image', ogImage)

    setMetaTag('name', 'twitter:card', 'summary_large_image')
    setMetaTag('name', 'twitter:title', fullTitle)
    setMetaTag('name', 'twitter:description', description)
    setMetaTag('name', 'twitter:image', ogImage)
  }, [title, description, path, type, noIndex, keywords, image])

  return null
}
