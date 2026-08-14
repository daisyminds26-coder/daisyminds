import {
  BarChart3,
  BrainCircuit,
  Cloud,
  Code2,
  Megaphone,
  ServerCog,
  ShieldCheck,
  Smartphone,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

/**
 * Daisy Minds' client-facing technology services — distinct from Programs
 * (`services/public-programs-service.ts`, student training, backed by the
 * LMS Course Management API). Deliberately static content the website team
 * owns and edits directly — never sourced from, or confused with, Course
 * Management. No fabricated stats/claims, matching the content rules
 * already applied to `data/why-daisy-minds.ts`/`data/plans.ts`.
 */
export interface ServiceFeature {
  title: string
  description: string
}

export interface Service {
  slug: string
  title: string
  /** Short — used on cards and in the mega menu. */
  shortDescription: string
  /** Fuller — the detail page's hero paragraph. */
  description: string
  icon: LucideIcon
  /** Real photography reused from `public/images/` — never a fabricated/AI stock substitute. */
  heroImage: { src: string; alt: string }
  keyOfferings: ServiceFeature[]
  process: ServiceFeature[]
  technologies: string[]
  benefits: ServiceFeature[]
  seo: { title: string; description: string }
}

export const SERVICES: Service[] = [
  {
    slug: 'web-development',
    title: 'Web Development Services',
    shortDescription:
      'Custom, production-grade websites and web applications built on modern frameworks.',
    description:
      'From marketing sites to full-stack platforms, we build web products that are fast, accessible, and built to be maintained — not just shipped and forgotten. Every project starts from your actual business goal, not a template.',
    icon: Code2,
    heroImage: {
      src: '/images/programs/web-development.jpg',
      alt: 'A developer working on a web application',
    },
    keyOfferings: [
      {
        title: 'Marketing & Corporate Websites',
        description:
          'Fast, SEO-ready sites that represent your business well and convert visitors into leads.',
      },
      {
        title: 'Web Applications',
        description:
          'Full-stack products with real user accounts, dashboards, and business logic — not just static pages.',
      },
      {
        title: 'E-Commerce Platforms',
        description:
          'Storefronts built for real transaction volume, with sensible checkout and inventory flows.',
      },
      {
        title: 'API Development & Integration',
        description:
          'Clean, documented APIs and integrations with the third-party services your product depends on.',
      },
      {
        title: 'Website Modernization',
        description: 'Rebuilding or refactoring an aging site onto a maintainable, current stack.',
      },
    ],
    process: [
      {
        title: 'Discovery & Scoping',
        description:
          'We understand your goals, users, and constraints before writing a line of code.',
      },
      {
        title: 'Design & Architecture',
        description: 'Wireframes, technical architecture, and a clear plan before build begins.',
      },
      {
        title: 'Development',
        description: 'Iterative builds with regular check-ins — you see progress, not a black box.',
      },
      {
        title: 'Testing & QA',
        description: 'Cross-browser, cross-device testing before anything reaches production.',
      },
      {
        title: 'Launch & Support',
        description: 'A supported launch, with a clear handoff and ongoing support options after.',
      },
    ],
    technologies: [
      'React',
      'TypeScript',
      'Next.js',
      'Node.js',
      'Tailwind CSS',
      'PostgreSQL',
      'MongoDB',
    ],
    benefits: [
      {
        title: 'Engineers, Not Just Designers',
        description:
          'Built by people who also teach this stack — code quality is not an afterthought.',
      },
      {
        title: 'Built to Be Maintained',
        description: 'Clean, documented code your team (or ours) can actually work with later.',
      },
      {
        title: 'Direct Communication',
        description: 'You talk to the people building your product, not a account-manager layer.',
      },
    ],
    seo: {
      title: 'Web Development Services',
      description:
        'Custom website and web application development — from marketing sites to full-stack platforms, built on modern frameworks.',
    },
  },
  {
    slug: 'mobile-app-development',
    title: 'Mobile App Development',
    shortDescription:
      'Native and cross-platform mobile apps for Android and iOS, built for real users.',
    description:
      "We build mobile apps designed around how people actually use their phones — fast, reliable, and easy to maintain across both major platforms, using a stack matched to your product's real requirements.",
    icon: Smartphone,
    heroImage: {
      src: '/images/programs/android-development.jpg',
      alt: 'A developer testing a mobile app on a device',
    },
    keyOfferings: [
      {
        title: 'Cross-Platform Apps',
        description: 'One codebase targeting both Android and iOS, where that fits the product.',
      },
      {
        title: 'Native Android Development',
        description:
          'When performance or platform-specific features call for it, we build natively.',
      },
      {
        title: 'App Modernization',
        description: 'Rebuilding or extending an existing app onto a current, supportable stack.',
      },
      {
        title: 'Backend & API Integration',
        description:
          'The server side your app actually needs — auth, data sync, push notifications.',
      },
      {
        title: 'App Store Deployment',
        description: 'Handling the submission and release process for both major app stores.',
      },
    ],
    process: [
      {
        title: 'Product Definition',
        description: 'Clarifying core user flows before any screen is designed.',
      },
      {
        title: 'UI/UX Design',
        description:
          'Platform-appropriate design — an Android app should feel like Android, not a port.',
      },
      {
        title: 'Development',
        description: 'Iterative builds with testable increments, not one big-bang release.',
      },
      {
        title: 'Device & QA Testing',
        description: 'Tested across real device sizes and OS versions, not just a simulator.',
      },
      {
        title: 'Launch & Support',
        description: 'Store submission handled, plus a plan for updates after release.',
      },
    ],
    technologies: ['Kotlin', 'React Native', 'Flutter', 'Firebase', 'REST APIs', 'Google Play'],
    benefits: [
      {
        title: 'Platform-Appropriate Builds',
        description:
          "We choose native vs. cross-platform based on your product's needs, not a default.",
      },
      {
        title: 'Real Device Testing',
        description: 'Verified on real hardware before release, not just an emulator.',
      },
      {
        title: 'Post-Launch Support',
        description: "Apps need updates — we don't disappear after the store listing goes live.",
      },
    ],
    seo: {
      title: 'Mobile App Development Services',
      description:
        'Native and cross-platform mobile app development for Android and iOS — built for real users, ready to ship.',
    },
  },
  {
    slug: 'custom-software-development',
    title: 'Custom Software Development',
    shortDescription:
      'Bespoke software built around your actual workflow — not a fit-it-yourself template.',
    description:
      "When off-the-shelf software forces you to change how you work, custom software fixes that instead. We build internal tools, automation, and systems shaped around your team's real process.",
    icon: ServerCog,
    heroImage: {
      src: '/images/students/coding-closeup.jpg',
      alt: 'A close-up of a developer writing code',
    },
    keyOfferings: [
      {
        title: 'Internal Tools & Dashboards',
        description: 'Purpose-built tools for the specific workflows your team runs every day.',
      },
      {
        title: 'Process Automation',
        description: "Automating the repetitive, manual steps eating your team's time.",
      },
      {
        title: 'Legacy System Modernization',
        description: 'Bringing an aging internal system onto a current, supportable stack.',
      },
      {
        title: 'Systems Integration',
        description: 'Connecting the tools you already use so data stops living in silos.',
      },
      {
        title: 'Custom Reporting Systems',
        description: 'Reporting shaped around the metrics your business actually tracks.',
      },
    ],
    process: [
      {
        title: 'Workflow Analysis',
        description: 'Understanding how your team actually works before proposing a solution.',
      },
      {
        title: 'Solution Design',
        description: 'A system designed around your process — not the other way around.',
      },
      {
        title: 'Development',
        description: 'Built in stages, with working software to review along the way.',
      },
      {
        title: 'Testing & Validation',
        description: 'Tested against your real use cases, with your team involved.',
      },
      {
        title: 'Deployment & Training',
        description: 'Rolled out with the training your team needs to actually adopt it.',
      },
    ],
    technologies: ['Node.js', 'TypeScript', 'Python', 'PostgreSQL', 'Docker', 'GraphQL'],
    benefits: [
      {
        title: 'Built Around You',
        description: 'The software adapts to your process, not the reverse.',
      },
      {
        title: 'No Vendor Lock-In',
        description: 'You own the code and the architecture — full transparency, no black box.',
      },
      {
        title: 'Scoped to Fit',
        description:
          'Right-sized for what you actually need, not an over-built enterprise platform.',
      },
    ],
    seo: {
      title: 'Custom Software Development Services',
      description:
        'Bespoke software, internal tools, and workflow automation built around your business — not a generic off-the-shelf fit.',
    },
  },
  {
    slug: 'ai-solutions',
    title: 'AI Solutions',
    shortDescription: 'Practical applied-AI features and integrations for real product problems.',
    description:
      "We build applied-AI features that solve a specific, real problem — intelligent automation, model-backed product capabilities, and integrations with today's leading AI providers — grounded in what the technology can actually deliver.",
    icon: BrainCircuit,
    heroImage: {
      src: '/images/programs/artificial-intelligence.jpg',
      alt: 'A developer working with AI-driven data visualizations',
    },
    keyOfferings: [
      {
        title: 'AI Feature Integration',
        description:
          'Adding AI-backed capabilities to an existing product where they genuinely help.',
      },
      {
        title: 'Intelligent Automation',
        description:
          "Automating judgment-heavy tasks that pure rules-based automation can't handle.",
      },
      {
        title: 'Chatbots & Assistants',
        description:
          'Purpose-built conversational tools scoped to a real use case, not a generic bot.',
      },
      {
        title: 'Data Pipeline & Model Integration',
        description: 'Wiring real data into a model-backed feature, end to end.',
      },
      {
        title: 'AI Strategy Consulting',
        description:
          "An honest read on where applied AI fits your product and where it doesn't — yet.",
      },
    ],
    process: [
      {
        title: 'Problem Scoping',
        description:
          'Identifying a specific problem AI can genuinely help solve — not AI for its own sake.',
      },
      {
        title: 'Feasibility & Data Review',
        description: 'Checking the data and constraints before committing to a build.',
      },
      {
        title: 'Prototype',
        description: 'A working prototype to validate the approach before full build-out.',
      },
      {
        title: 'Development & Integration',
        description: 'Building the feature into your real product, not a standalone demo.',
      },
      {
        title: 'Monitoring & Iteration',
        description:
          'AI features need ongoing monitoring — we set that up, not just ship and leave.',
      },
    ],
    technologies: ['Python', 'OpenAI', 'Anthropic', 'LangChain', 'FastAPI'],
    benefits: [
      {
        title: 'Grounded, Not Hyped',
        description:
          "We recommend AI where it genuinely fits — and say so plainly when it doesn't.",
      },
      {
        title: 'Production-Ready, Not Just a Demo',
        description: 'Built with real error handling, monitoring, and cost awareness.',
      },
      {
        title: 'Vendor-Neutral',
        description:
          'We choose the right model/provider for your use case, not a fixed vendor relationship.',
      },
    ],
    seo: {
      title: 'AI Solutions & Applied AI Development',
      description:
        'Practical applied-AI features, intelligent automation, and model-backed product capabilities — grounded, production-ready builds.',
    },
  },
  {
    slug: 'data-analytics-bi',
    title: 'Data Analytics & BI',
    shortDescription:
      'Turning raw operational data into dashboards and reporting your team can act on.',
    description:
      'Most businesses have more data than they use. We build the pipelines, dashboards, and reporting that turn what you already collect into decisions your team can actually make.',
    icon: BarChart3,
    heroImage: {
      src: '/images/programs/data-analytics.jpg',
      alt: 'A data analytics dashboard on a laptop screen',
    },
    keyOfferings: [
      {
        title: 'Business Intelligence Dashboards',
        description: 'Real-time, decision-ready views of the metrics that matter to your business.',
      },
      {
        title: 'Data Pipeline Development',
        description:
          "Reliable pipelines that get data from where it's generated to where it's used.",
      },
      {
        title: 'Data Warehousing',
        description:
          'A single, queryable source of truth instead of data scattered across systems.',
      },
      {
        title: 'Custom Reporting',
        description: 'Reports built around your actual KPIs, not a generic template.',
      },
      {
        title: 'Data Visualization',
        description: 'Clear, honest visualizations — no chart chosen to mislead.',
      },
    ],
    process: [
      {
        title: 'Data Audit',
        description: 'Understanding what data you have, where it lives, and its quality.',
      },
      {
        title: 'Metrics Definition',
        description: 'Agreeing on what actually needs to be measured before building anything.',
      },
      {
        title: 'Pipeline & Warehouse Build',
        description: 'Getting data flowing reliably into one place.',
      },
      {
        title: 'Dashboard Development',
        description: 'Building views your team will actually check, not ignore.',
      },
      {
        title: 'Handoff & Training',
        description: "Making sure your team can maintain and extend it after we're done.",
      },
    ],
    technologies: ['Python', 'SQL', 'Power BI', 'Metabase', 'PostgreSQL', 'Apache Airflow'],
    benefits: [
      {
        title: 'Decision-Focused',
        description: 'Every dashboard is built to answer a real question, not to look impressive.',
      },
      {
        title: 'Honest Reporting',
        description: 'No cherry-picked metrics — reporting built to inform, not to flatter.',
      },
      {
        title: 'Maintainable Pipelines',
        description: 'Built so your own team can extend it, not locked to us.',
      },
    ],
    seo: {
      title: 'Data Analytics & Business Intelligence Services',
      description:
        'Data pipelines, dashboards, and BI reporting that turn raw operational data into decisions your team can act on.',
    },
  },
  {
    slug: 'cloud-solutions',
    title: 'Cloud Solutions',
    shortDescription:
      'Cloud architecture, migration, and infrastructure built for reliability and sensible cost.',
    description:
      "We design and manage cloud infrastructure sized for what you actually need — reliable, secure, and cost-aware, whether you're migrating an existing system or building cloud-native from day one.",
    icon: Cloud,
    heroImage: {
      src: '/images/programs/cloud-computing.jpg',
      alt: 'Cloud infrastructure and server racks',
    },
    keyOfferings: [
      {
        title: 'Cloud Migration',
        description: 'Moving existing systems to the cloud with a plan for minimal downtime.',
      },
      {
        title: 'Infrastructure Architecture',
        description: 'Cloud infrastructure designed for your actual scale, not over-provisioned.',
      },
      {
        title: 'Cost Optimization',
        description: "Reviewing and right-sizing cloud spend that's grown without a plan.",
      },
      {
        title: 'Scalability Planning',
        description: 'Architecture that can grow with real traffic, not fragile at scale.',
      },
      {
        title: 'Backup & Disaster Recovery',
        description: 'A real, tested recovery plan — not just "we have backups somewhere."',
      },
    ],
    process: [
      {
        title: 'Infrastructure Assessment',
        description: 'Understanding your current setup and real requirements.',
      },
      {
        title: 'Architecture Design',
        description: 'A cloud architecture sized and secured for your actual needs.',
      },
      {
        title: 'Migration or Build-Out',
        description: 'Executed in stages, with rollback plans, not a risky single cutover.',
      },
      {
        title: 'Security Hardening',
        description:
          'Access controls, encryption, and monitoring configured properly from the start.',
      },
      {
        title: 'Ongoing Management',
        description: 'Optional continued management, monitoring, and cost review after go-live.',
      },
    ],
    technologies: ['AWS', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform', 'Nginx'],
    benefits: [
      {
        title: 'Right-Sized, Not Over-Built',
        description: 'Infrastructure matched to your real traffic and budget.',
      },
      {
        title: 'Security-First',
        description:
          'Access and data protection built in from the architecture stage, not bolted on after.',
      },
      { title: 'Cost-Transparent', description: "You see exactly what you're paying for and why." },
    ],
    seo: {
      title: 'Cloud Solutions & Infrastructure Services',
      description:
        'Cloud architecture, migration, and infrastructure setup built for reliability and cost-sensible scaling.',
    },
  },
  {
    slug: 'devops-services',
    title: 'DevOps Services',
    shortDescription:
      'CI/CD pipelines and infrastructure automation that keep releases fast and safe.',
    description:
      'Slow, risky releases usually come down to process, not people. We build CI/CD pipelines and deployment automation that let your team ship confidently and often.',
    icon: Workflow,
    heroImage: {
      src: '/images/programs/devops.jpg',
      alt: 'A DevOps engineer monitoring deployment pipelines',
    },
    keyOfferings: [
      {
        title: 'CI/CD Pipeline Setup',
        description: 'Automated build, test, and deploy pipelines replacing manual release steps.',
      },
      {
        title: 'Infrastructure as Code',
        description:
          'Infrastructure defined in version-controlled code, not manual console changes.',
      },
      {
        title: 'Monitoring & Alerting',
        description: 'Real visibility into system health, with alerts that reach the right person.',
      },
      {
        title: 'Containerization',
        description: 'Packaging applications for consistent behavior across every environment.',
      },
      {
        title: 'Release Process Design',
        description: 'A release process your team can trust — with rollback built in.',
      },
    ],
    process: [
      {
        title: 'Current-State Review',
        description: "Understanding today's release process and where it actually breaks down.",
      },
      {
        title: 'Pipeline Design',
        description: 'Designing CI/CD suited to your stack and team size — not a generic template.',
      },
      {
        title: 'Implementation',
        description: 'Building it incrementally, validated against real deployments.',
      },
      {
        title: 'Monitoring Setup',
        description: 'Wiring up observability so issues are caught before users report them.',
      },
      {
        title: 'Team Handoff',
        description: 'Documentation and training so your team owns the pipeline going forward.',
      },
    ],
    technologies: [
      'Docker',
      'Kubernetes',
      'GitHub Actions',
      'Jenkins',
      'Terraform',
      'Prometheus',
      'Grafana',
    ],
    benefits: [
      {
        title: 'Fewer Bad Releases',
        description: 'Automated testing and staged rollouts catch problems before production.',
      },
      {
        title: 'Faster Shipping',
        description: 'What took a day manually can take minutes, safely.',
      },
      {
        title: 'Team-Owned',
        description:
          'We hand off pipelines your team can actually operate, not a dependency on us.',
      },
    ],
    seo: {
      title: 'DevOps Services',
      description:
        'CI/CD pipelines, infrastructure automation, and deployment practices that keep software releases fast and safe.',
    },
  },
  {
    slug: 'cybersecurity-services',
    title: 'Cybersecurity Services',
    shortDescription:
      "Security assessments and hardening that protect your systems and your customers' data.",
    description:
      'Security is a practice, not a one-time checklist. We assess, harden, and help maintain the security posture of your systems — grounded in real risk, not fear-based upselling.',
    icon: ShieldCheck,
    heroImage: {
      src: '/images/programs/cybersecurity.jpg',
      alt: 'A security engineer reviewing system logs',
    },
    keyOfferings: [
      {
        title: 'Security Assessments',
        description: 'A clear-eyed review of your actual attack surface and real risk.',
      },
      {
        title: 'Application Hardening',
        description: 'Fixing the specific vulnerabilities found — not a generic checklist.',
      },
      {
        title: 'Infrastructure Security Review',
        description: 'Reviewing cloud and server configuration against real misconfiguration risk.',
      },
      {
        title: 'Access Control & Auth Review',
        description:
          'Making sure authentication and authorization actually hold up under scrutiny.',
      },
      {
        title: 'Security Awareness Support',
        description: 'Practical guidance for your team, not just a technical report.',
      },
    ],
    process: [
      {
        title: 'Scoping',
        description: "Agreeing exactly what's being assessed and the rules of engagement.",
      },
      { title: 'Assessment', description: 'A structured review of the systems in scope.' },
      {
        title: 'Findings & Risk Rating',
        description: 'A clear report — real findings, honestly rated by actual risk, not inflated.',
      },
      {
        title: 'Remediation Support',
        description: 'Helping you fix what was found, not just handing over a PDF.',
      },
      {
        title: 'Re-Verification',
        description: 'Confirming fixes actually close the gap before calling it done.',
      },
    ],
    technologies: ['OWASP', 'Burp Suite', 'Nmap', 'Cloud Security'],
    benefits: [
      {
        title: 'Risk-Based, Not Fear-Based',
        description: "Findings rated by real impact — we don't inflate severity to sell more work.",
      },
      {
        title: 'Remediation-Focused',
        description: 'We help fix issues, not just report them and walk away.',
      },
      {
        title: 'No Guaranteed-Unhackable Claims',
        description: 'Security is ongoing risk reduction — we never claim otherwise.',
      },
    ],
    seo: {
      title: 'Cybersecurity Services',
      description:
        "Security assessments, application hardening, and ongoing practices that protect your systems and your customers' data.",
    },
  },
  {
    slug: 'digital-marketing-services',
    title: 'Digital Marketing Services',
    shortDescription:
      'SEO, content, and performance marketing to help a growing tech business get found.',
    description:
      'Good technology still needs to be found. We provide SEO, content, and performance-marketing support scoped to a growing technology business — measured by real outcomes, not vanity metrics.',
    icon: Megaphone,
    heroImage: {
      src: '/images/programs/digital-marketing.jpg',
      alt: 'A marketer reviewing campaign analytics',
    },
    keyOfferings: [
      {
        title: 'SEO Strategy & Execution',
        description:
          'Technical and content SEO built to improve real, sustainable search visibility.',
      },
      {
        title: 'Content Marketing',
        description: 'Content built around what your actual customers search for.',
      },
      {
        title: 'Performance Marketing',
        description: 'Paid campaigns measured against real conversion outcomes, not just clicks.',
      },
      {
        title: 'Website Conversion Optimization',
        description: 'Improving the site you already have to convert more of the traffic it gets.',
      },
      {
        title: 'Marketing Analytics Setup',
        description: "Proper tracking so you know what's actually working.",
      },
    ],
    process: [
      {
        title: 'Audit',
        description: 'Reviewing your current site, content, and channels honestly.',
      },
      {
        title: 'Strategy',
        description: 'A plan built around your actual goals and budget, not a generic package.',
      },
      {
        title: 'Execution',
        description:
          'Running the work — content, technical SEO, or campaigns — on a defined cadence.',
      },
      {
        title: 'Measurement',
        description: 'Reporting against the metrics that were actually agreed on upfront.',
      },
      {
        title: 'Iteration',
        description:
          'Adjusting the approach based on what the data shows, not sticking to a fixed plan.',
      },
    ],
    technologies: ['Google Search Console', 'Google Analytics', 'Google Ads', 'SEMrush', 'Ahrefs'],
    benefits: [
      {
        title: 'Outcome-Measured',
        description: 'Reported against real conversions and rankings — not just impressions.',
      },
      {
        title: 'No Guaranteed-Rankings Promises',
        description: 'We never promise a specific ranking — no one honestly can.',
      },
      {
        title: 'Built for a Tech Audience',
        description:
          "We understand the technical products we're marketing, not just the marketing.",
      },
    ],
    seo: {
      title: 'Digital Marketing Services',
      description:
        'SEO, content, and performance marketing support to help a growing technology business get found.',
    },
  },
]
