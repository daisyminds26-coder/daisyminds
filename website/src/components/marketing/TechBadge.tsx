import {
  SiAnthropic,
  SiApacheairflow,
  SiBurpsuite,
  SiDocker,
  SiFastapi,
  SiFirebase,
  SiFlutter,
  SiGithubactions,
  SiGoogleads,
  SiGoogleanalytics,
  SiGooglecloud,
  SiGoogleplay,
  SiGooglesearchconsole,
  SiGrafana,
  SiGraphql,
  SiJenkins,
  SiKotlin,
  SiKubernetes,
  SiLangchain,
  SiMetabase,
  SiMongodb,
  SiNextdotjs,
  SiNginx,
  SiNodedotjs,
  SiOwasp,
  SiPostgresql,
  SiPrometheus,
  SiPython,
  SiReact,
  SiSemrush,
  SiTailwindcss,
  SiTerraform,
  SiTypescript,
} from 'react-icons/si'
import type { IconType } from 'react-icons'
import {
  BrainCircuit,
  Cloud,
  Database,
  Network,
  Search,
  Shield,
  type LucideIcon,
} from 'lucide-react'

/**
 * "Flat icons" for the Technologies section on `ServiceDetailPage.tsx` —
 * Simple Icons (via `react-icons/si`) for real, identifiable products,
 * rendered in a single flat tone via `currentColor` (no multicolor brand
 * marks, consistent with the rest of the site's icon treatment). This is
 * standard nominative use (identifying tools worked with), not an
 * endorsement claim. A neutral Lucide icon covers the handful of entries
 * with no exact brand mark (e.g. "REST APIs", "AWS" — Simple Icons has no
 * AWS mark — descriptive terms like "Cloud Security") rather than guessing
 * at a wrong or misleading logo.
 */
const BRAND_ICONS: Record<string, IconType> = {
  React: SiReact,
  TypeScript: SiTypescript,
  'Next.js': SiNextdotjs,
  'Node.js': SiNodedotjs,
  'Tailwind CSS': SiTailwindcss,
  PostgreSQL: SiPostgresql,
  MongoDB: SiMongodb,
  Kotlin: SiKotlin,
  'React Native': SiReact,
  Flutter: SiFlutter,
  Firebase: SiFirebase,
  'Google Play': SiGoogleplay,
  Python: SiPython,
  Docker: SiDocker,
  GraphQL: SiGraphql,
  Anthropic: SiAnthropic,
  FastAPI: SiFastapi,
  LangChain: SiLangchain,
  Metabase: SiMetabase,
  'Apache Airflow': SiApacheairflow,
  'Google Cloud': SiGooglecloud,
  Kubernetes: SiKubernetes,
  Terraform: SiTerraform,
  Nginx: SiNginx,
  'GitHub Actions': SiGithubactions,
  Jenkins: SiJenkins,
  Prometheus: SiPrometheus,
  Grafana: SiGrafana,
  OWASP: SiOwasp,
  'Burp Suite': SiBurpsuite,
  'Google Search Console': SiGooglesearchconsole,
  'Google Analytics': SiGoogleanalytics,
  'Google Ads': SiGoogleads,
  SEMrush: SiSemrush,
}

const FALLBACK_ICONS: Record<string, LucideIcon> = {
  AWS: Cloud,
  'REST APIs': Network,
  SQL: Database,
  'Power BI': Database,
  OpenAI: BrainCircuit,
  Nmap: Search,
  'Cloud Security': Shield,
  Ahrefs: Search,
}

const DEFAULT_ICON: LucideIcon = Database

export function TechBadge({ name }: { name: string }) {
  const BrandIcon = BRAND_ICONS[name]
  const FallbackIcon = FALLBACK_ICONS[name] ?? (BrandIcon ? undefined : DEFAULT_ICON)

  return (
    <span className="border-border-soft bg-background text-ink inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium">
      {BrandIcon ? (
        <BrandIcon className="size-4" aria-hidden="true" />
      ) : FallbackIcon ? (
        <FallbackIcon className="size-4" aria-hidden="true" />
      ) : null}
      {name}
    </span>
  )
}
