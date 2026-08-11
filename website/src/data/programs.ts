import type { Program } from '@/types/program'

/**
 * Static placeholder content standing in for `GET /api/v1/public/courses`.
 * Every function below is already `async` so call sites never need to
 * change when this is swapped for a real fetch — only the function bodies
 * do. Never call an authenticated LMS admin endpoint from here.
 */
const PROGRAMS: Program[] = [
  {
    slug: 'full-stack-web-development',
    title: 'Full Stack Web Development',
    category: 'Software Development',
    level: 'Beginner',
    mode: 'Hybrid',
    durationLabel: '24 weeks',
    outcome: 'Ship production React + Node applications and interview-ready for junior roles.',
    summary:
      'From HTML fundamentals to deployed full-stack applications — the complete path into professional web development.',
    description:
      'A project-first curriculum covering modern frontend engineering with React and TypeScript, backend APIs with Node.js, and the database, deployment, and Git workflows every engineering team expects on day one. Every module ends with a real, portfolio-worthy build.',
    skills: ['HTML & CSS', 'JavaScript', 'React', 'TypeScript', 'Node.js', 'MongoDB', 'Git'],
    modules: [
      {
        title: 'Frontend Foundations',
        summary: 'Semantic HTML, modern CSS, and JavaScript fundamentals.',
      },
      {
        title: 'React & TypeScript',
        summary: 'Component architecture, state, hooks, and type-safe UI.',
      },
      { title: 'Backend with Node.js', summary: 'REST APIs, authentication, and database design.' },
      { title: 'Capstone & Deployment', summary: 'A full-stack capstone shipped to production.' },
    ],
    mentorSupport: 'Weekly 1:1 mentor reviews plus daily doubt-clearing sessions.',
    accent: 'yellow',
  },
  {
    slug: 'data-science-analytics',
    title: 'Data Science & Analytics',
    category: 'Data & AI',
    level: 'Intermediate',
    mode: 'Online',
    durationLabel: '20 weeks',
    outcome:
      'Build and communicate data-driven models using Python, SQL, and real business datasets.',
    summary:
      'Statistics, Python, and machine learning fundamentals taught through real business case studies, not toy datasets.',
    description:
      'Covers the full analytics lifecycle — from data cleaning and exploratory analysis in Python and SQL, through statistical inference, to building and evaluating machine learning models. Case studies are drawn from retail, fintech, and product analytics.',
    skills: ['Python', 'SQL', 'Statistics', 'Pandas', 'Scikit-learn', 'Data Visualization'],
    modules: [
      {
        title: 'Python & SQL Foundations',
        summary: 'Data wrangling with Pandas and relational queries.',
      },
      {
        title: 'Statistics for Decisions',
        summary: 'Hypothesis testing, probability, and inference.',
      },
      { title: 'Machine Learning', summary: 'Regression, classification, and model evaluation.' },
      { title: 'Applied Capstone', summary: 'An end-to-end analysis presented to a review panel.' },
    ],
    mentorSupport: 'Case-study reviews with working data professionals.',
    accent: 'charcoal',
  },
  {
    slug: 'ui-ux-product-design',
    title: 'UI/UX Product Design',
    category: 'Design',
    level: 'Beginner',
    mode: 'Hybrid',
    durationLabel: '16 weeks',
    outcome: 'Design and prototype a complete product case study worthy of a design portfolio.',
    summary:
      'Research, wireframing, visual design, and prototyping — grounded in real product-design practice, not templates.',
    description:
      'Learn user research, information architecture, interaction design, and high-fidelity visual design in Figma, then validate decisions through usability testing. The program ends with a full case study — the single most important asset in a design portfolio.',
    skills: ['Figma', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
    modules: [
      { title: 'Research & Discovery', summary: 'User interviews, personas, and problem framing.' },
      { title: 'Interaction Design', summary: 'Information architecture and wireframing.' },
      { title: 'Visual Design Systems', summary: 'Typography, color, and component libraries.' },
      { title: 'Portfolio Case Study', summary: 'A polished, presentation-ready case study.' },
    ],
    mentorSupport: 'Live design critiques every fortnight.',
    accent: 'yellow',
  },
  {
    slug: 'cloud-devops-engineering',
    title: 'Cloud & DevOps Engineering',
    category: 'Infrastructure',
    level: 'Advanced',
    mode: 'Online',
    durationLabel: '18 weeks',
    outcome: 'Design, automate, and operate cloud infrastructure using industry-standard tooling.',
    summary:
      'Cloud architecture, containerization, and CI/CD pipelines for engineers ready to move into platform and infra roles.',
    description:
      'Covers cloud fundamentals, Docker and container orchestration, infrastructure as code, and building CI/CD pipelines that ship safely. Designed for engineers who already write code and want to own how it gets deployed and operated.',
    skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Linux'],
    modules: [
      { title: 'Cloud Fundamentals', summary: 'Core AWS services and networking basics.' },
      { title: 'Containers & Orchestration', summary: 'Docker, Kubernetes, and service design.' },
      { title: 'Infrastructure as Code', summary: 'Terraform-driven, repeatable environments.' },
      { title: 'CI/CD & Operations', summary: 'Pipelines, monitoring, and incident response.' },
    ],
    mentorSupport: 'Architecture reviews with practicing platform engineers.',
    accent: 'graphite',
  },
  {
    slug: 'digital-marketing-growth',
    title: 'Digital Marketing & Growth',
    category: 'Marketing',
    level: 'Beginner',
    mode: 'Online',
    durationLabel: '12 weeks',
    outcome: 'Plan, launch, and measure multi-channel campaigns against real business goals.',
    summary:
      'SEO, paid acquisition, content, and analytics — taught as one connected growth system, not isolated channels.',
    description:
      'A channel-agnostic curriculum covering SEO, paid social and search, content strategy, email, and the analytics stack needed to prove what actually drives growth. Every learner runs a live campaign with a real (capped) budget during the program.',
    skills: ['SEO', 'Paid Media', 'Content Strategy', 'Analytics', 'Email Marketing'],
    modules: [
      { title: 'Growth Foundations', summary: 'Funnels, positioning, and channel strategy.' },
      { title: 'Search & Content', summary: 'SEO fundamentals and content that ranks.' },
      { title: 'Paid Acquisition', summary: 'Search and social ad campaigns with real budgets.' },
      {
        title: 'Analytics & Reporting',
        summary: 'Attribution, dashboards, and stakeholder reporting.',
      },
    ],
    mentorSupport: 'Live campaign reviews with a growth marketing mentor.',
    accent: 'yellow',
  },
  {
    slug: 'cybersecurity-fundamentals',
    title: 'Cybersecurity Fundamentals',
    category: 'Security',
    level: 'Intermediate',
    mode: 'Hybrid',
    durationLabel: '20 weeks',
    outcome: 'Assess, defend, and report on real-world security vulnerabilities.',
    summary:
      'Network security, ethical hacking, and defensive practice in a hands-on lab environment throughout.',
    description:
      'Covers network fundamentals, common attack techniques, and defensive security practice through guided labs and capture-the-flag exercises. Learners finish with a documented penetration-testing project suitable for a security portfolio.',
    skills: ['Network Security', 'Ethical Hacking', 'Risk Assessment', 'Security Tooling'],
    modules: [
      {
        title: 'Security Foundations',
        summary: 'Networking, protocols, and the threat landscape.',
      },
      { title: 'Offensive Security Labs', summary: 'Guided penetration-testing exercises.' },
      { title: 'Defensive Practice', summary: 'Hardening, monitoring, and incident response.' },
      { title: 'Capstone Assessment', summary: 'A full, documented security assessment.' },
    ],
    mentorSupport: 'Lab walkthroughs with certified security mentors.',
    accent: 'charcoal',
  },
]

export async function getPrograms(): Promise<Program[]> {
  return Promise.resolve(PROGRAMS)
}

export async function getProgramBySlug(slug: string): Promise<Program | undefined> {
  return Promise.resolve(PROGRAMS.find((program) => program.slug === slug))
}

export async function getFeaturedPrograms(limit = 3): Promise<Program[]> {
  return Promise.resolve(PROGRAMS.slice(0, limit))
}

export function getProgramCategories(): string[] {
  return Array.from(new Set(PROGRAMS.map((program) => program.category)))
}
