/**
 * Generates `dist/sitemap.xml` — run as a `postbuild` step (see
 * `package.json`), never at request time, since this is a static Vite SPA
 * with no server to answer a dynamic sitemap request. Static routes and
 * Services (`data/services.ts`, static content) are known at build time;
 * Programs are fetched live from the public Course Management API so the
 * sitemap reflects whatever is actually published right now, not a
 * hardcoded list.
 *
 * Known limitation, stated rather than silently assumed away: this only
 * refreshes on a website *build* (a deploy). A program published on the
 * LMS between deploys won't appear in the sitemap until the next build —
 * true real-time freshness would need the sitemap served dynamically
 * (e.g. from the backend), which is a separate, larger infra decision
 * (Nginx routing, a new backend endpoint) not made here.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import { SERVICES } from '../src/data/services.ts'

const SITE_URL = process.env.VITE_SITE_URL ?? 'https://daisyminds.com'
const API_BASE_URL = process.env.VITE_API_BASE_URL ?? 'https://api.daisyminds.com/api/v1'
const PROGRAMS_PAGE_LIMIT = 50 // matches the public API's own max (public-programs.validator.ts)

type ChangeFreq = 'daily' | 'weekly' | 'monthly'

interface SitemapEntry {
  path: string
  changefreq: ChangeFreq
  priority: string
}

const STATIC_ROUTES: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/services', changefreq: 'monthly', priority: '0.8' },
  { path: '/programs', changefreq: 'daily', priority: '0.9' },
  { path: '/plans', changefreq: 'monthly', priority: '0.6' },
  { path: '/faq', changefreq: 'monthly', priority: '0.5' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  // /apply is deliberately excluded — noindex (a checkout-style flow, not content).
]

const SERVICE_ROUTES: SitemapEntry[] = SERVICES.map((service) => ({
  path: `/services/${service.slug}`,
  changefreq: 'monthly',
  priority: '0.7',
}))

interface PublicProgramListItem {
  slug: string
}
interface PublicProgramListResponse {
  data: PublicProgramListItem[]
  meta: { page: number; totalPages: number }
}

/** Paginates through every published program — never assumes the catalog fits in one page. */
async function fetchProgramRoutes(): Promise<SitemapEntry[]> {
  const routes: SitemapEntry[] = []
  let page = 1
  let totalPages = 1

  try {
    do {
      const response = await fetch(
        `${API_BASE_URL}/public/programs?page=${String(page)}&limit=${String(PROGRAMS_PAGE_LIMIT)}`,
      )
      if (!response.ok) throw new Error(`Backend responded ${String(response.status)}`)

      const body = (await response.json()) as PublicProgramListResponse
      for (const program of body.data) {
        routes.push({ path: `/programs/${program.slug}`, changefreq: 'weekly', priority: '0.8' })
      }
      totalPages = body.meta.totalPages
      page += 1
    } while (page <= totalPages)

    return routes
  } catch (error) {
    console.warn(
      '[sitemap] Could not reach the public programs API — sitemap will omit /programs/:slug entries this build.',
      error instanceof Error ? error.message : error,
    )
    return []
  }
}

function buildXml(entries: SitemapEntry[]): string {
  const lastmod = new Date().toISOString()
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${SITE_URL}${entry.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

async function main(): Promise<void> {
  const programRoutes = await fetchProgramRoutes()
  const entries = [...STATIC_ROUTES, ...SERVICE_ROUTES, ...programRoutes]

  mkdirSync('dist', { recursive: true })
  writeFileSync('dist/sitemap.xml', buildXml(entries), 'utf-8')

  // `no-console` only allows warn/error in this codebase's eslint config —
  // this is an informational build-step log, not a real warning.
  console.warn(
    `[sitemap] Wrote dist/sitemap.xml — ${String(entries.length)} URLs (${String(programRoutes.length)} live programs).`,
  )
}

void main()
