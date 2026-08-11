# Daisy Minds — Public Website

The public marketing site for Daisy Minds — program discovery, SEO, and lead conversion. This is a **separate application** from `../frontend/` (the authenticated LMS); it never implements login and never imports LMS code. "Student Login" / "Explore Programs → Apply" always hard-navigate to the LMS via `VITE_LMS_URL`.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · React Router · Vitest + Testing Library

## Getting Started

```bash
cp .env.example .env   # optional — sensible localhost defaults are baked in
npm install
npm run dev
```

## Scripts

| Script                            | Purpose                      |
| --------------------------------- | ---------------------------- |
| `npm run dev`                     | Local dev server             |
| `npm run build`                   | Typecheck + production build |
| `npm run lint` / `lint:fix`       | ESLint                       |
| `npm run format` / `format:check` | Prettier                     |
| `npm run typecheck`               | `tsc -b`, no emit            |
| `npm run test` / `test:watch`     | Vitest                       |

## Architecture

```
src/
├── app/            # App shell + router
├── components/
│   ├── ui/         # Button, Container, Section, Badge, Accordion, Input…
│   ├── layout/      # Navbar, Footer, SiteChrome
│   ├── marketing/   # ProgramCard, TrainerCard, TestimonialCard, ProductMockCards…
│   ├── seo/         # <Seo>, <JsonLd>
│   └── motion/      # Reveal, Stagger, FloatingCard, shared variants
├── data/            # Static content + async "repository" functions —
│                     shaped like the eventual GET /api/v1/public/* endpoints
│                     so swapping in a real fetch later needs no call-site change
├── hooks/
├── pages/           # Route-level components
├── sections/        # Homepage narrative sections (one concern each)
├── styles/          # Design tokens (index.css)
├── types/
└── utils/
```

## Data layer

Nothing here calls an authenticated LMS admin endpoint. Every function in `data/*.ts` returns a `Promise` shaped like the eventual public API (`/api/v1/public/courses`, `/api/v1/public/trainers`, `/api/v1/public/batches`) — today they resolve static content instead of making a network call. Pages consume them with React 19's `use()` inside a `<Suspense>` boundary, not manual loading-state effects.

## SEO

Every route renders a `<Seo>` (title/description/canonical/Open Graph/Twitter) and, where relevant, a `<JsonLd>` block built from `utils/structured-data.ts` (`EducationalOrganization`, `Course`, `BreadcrumbList`, `FAQPage`). Structured data only ever reflects real content from `data/*.ts` — nothing fabricated.

## Environment

| Variable        | Purpose                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `VITE_LMS_URL`  | Base URL of `../frontend/` — every "Student Login" / "Apply" CTA routes here |
| `VITE_SITE_URL` | This site's own canonical URL, used to build absolute OG/canonical links     |

See `.env.example`. Both fall back to local dev defaults if unset.
