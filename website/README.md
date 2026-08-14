# Daisy Minds — Public Website

The public marketing site for Daisy Minds — program discovery, SEO, and lead conversion, through
to the point of payment. This is a **separate application** from `../frontend/` (the authenticated
LMS); it never re-implements login/registration and never imports LMS code. "Student Login" opens
the LMS directly via `VITE_LMS_URL`; the one exception is the `/apply` flow's Login step, which
calls the real LMS backend API directly (see [Authentication Handoff](#authentication-handoff)).

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · React Router · Vitest + Testing Library

## Getting Started

```bash
cp .env.example .env   # optional — sensible localhost defaults are baked in
npm install
npm run dev
```

To exercise the `/apply` flow's real Login step against a local backend, also run `../backend/`
and make sure its `CORS_ORIGINS` includes this app's dev origin (already set in
`backend/.env.example` — see [Authentication Handoff](#authentication-handoff)).

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
│   ├── ui/          # Button, Container, Section, Badge, Accordion, Input, ResponsiveImage…
│   ├── layout/       # Navbar (+ ProgramsMegaMenu), Footer, SiteChrome
│   ├── marketing/    # ProgramCard, ProgramImageFallback, ProgramCardSkeleton, PlanCard, ProgramIcon, TrainerCard, TestimonialCard…
│   ├── error/        # ProgramsErrorBoundary — catches a rejected programs-API promise thrown by use()
│   ├── apply/        # The /apply stepper: StepperNav, ApplicationSummaryCard, steps/*, PaymentSuccessScreen
│   ├── seo/          # <Seo>, <JsonLd>
│   └── motion/       # Reveal, Stagger, FloatingCard, shared variants
├── data/             # Static content only — services.ts (client services), plans.ts, trainers.ts,
│                       testimonials.ts, batches.ts (homepage teaser), why-daisy-minds.ts…
├── services/         # auth-service.ts (real LMS login call) and public-programs-service.ts
│                       (real LMS public-programs API call) — the two places this app talks to a
│                       real backend
├── hooks/            # useApplicationState (apply-flow selection persistence), usePrefersReducedMotion…
├── pages/            # Route-level components
├── sections/         # Homepage narrative sections (one concern each)
├── styles/           # Design tokens (index.css)
├── types/
└── utils/
```

## Programs architecture — dynamic, sourced from LMS Course Management

Training programs are **no longer static content in this repo.** Admin Course Management
(`../backend/`) is the single source of truth; this site reads it through a deliberately narrow,
unauthenticated public API:

```
Admin Course Management  →  GET /api/v1/public/programs(/:slug)  →  services/public-programs-service.ts  →  ProgramsPage / ProgramDetailPage / FeaturedPrograms / ProgramsMegaMenu
```

- `services/public-programs-service.ts` — the only place this concern is fetched. Mirrors
  `auth-service.ts`'s pattern (raw `fetch`, a typed `*ApiError` class, `{data: T}` body-unwrap) and
  reads the same `VITE_API_BASE_URL`. Exports `getPrograms(filters?)`, `getProgramBySlug(slug)`,
  `getFeaturedPrograms(limit?)`, `getProgramCategories()` — a short in-module cache (~60s TTL,
  matching the backend's own `Cache-Control: max-age=60`) also de-dupes in-flight requests, so
  `Navbar`/`ProgramsMegaMenu`/`ProgramsPage` calling `getPrograms()` independently share one
  request instead of each firing their own.
- `types/program.ts` — `Program`/`ProgramListItem` mirror the backend's public DTO
  (`backend/src/services/public-programs-dto.ts`) field-for-field. Fields the old static content
  had that Course Management doesn't (FAQ, career opportunities, tools, projects, mentor-support
  copy, curriculum "highlights") are gone, not faked — a real `courseMarketing` schema addition
  could bring these back later if wanted, deliberately not built this pass.
- **No hardcoded fallback data.** A backend outage in dev renders the real loading/error UI
  (`ProgramCardSkeleton`, `ProgramsErrorBoundary` with retry) — never silently stale static
  content standing in as if it were live.
- **Curriculum preview and upcoming batches are real**, not marketing copy: `ProgramDetailPage`
  renders the course's actual published modules/lessons and real upcoming batches (with a derived
  `AVAILABLE`/`LIMITED`/`FULL` badge, never a fabricated seat count).

**Canonical route:** `/programs/:slug` (`ProgramDetailPage`). `/services/:slug` — a training-URL
artifact from an earlier, incorrect Services/Programs merge — redirects to `/programs/:slug` so no
old link 404s. See "Services vs. Programs" below for the current, correct route split.

## Services vs. Programs

Two different concepts, deliberately kept apart:

- **`/programs`** — student training, dynamically sourced from LMS Course Management (above).
- **`/services`** — Daisy Minds' own client-facing technology services (Web Development, Mobile
  App Development, Custom Software, AI Solutions, Data Analytics & BI, Cloud Solutions, DevOps,
  Cybersecurity, Digital Marketing). A single static listing page (`data/services.ts`,
  `pages/ServicesPage.tsx`) — no per-service detail routes, no CMS, no Course Management
  involvement. If a Services CMS is ever wanted, that's a separate, future decision.

## Plans architecture

`types/plan.ts` / `data/plans.ts` hold the three learning-path tiers (Short Term Foundation
Modules / Specialized & Mid Level Training / Advanced Job-Ready Bootcamps) — one source of truth
for pricing and features; never hardcode a price anywhere else. `getPlans()`/`getPlanBySlug()`/
`getPlanById()` follow the same async-placeholder pattern as programs. `formatPlanPrice()` is the
one place INR formatting happens.

Plans are a commercial/depth tier independent of any single program's own `duration`/`level`
fields — the same three plans apply across every published program.

## Application flow (`/apply`)

A four-step stepper (Program → Plan → Account → Payment), built in `components/apply/`:

1. **Program** — shows the program carried over via `?program=slug` (changeable), or prompts a
   selection from every published program if none was provided.
2. **Plan** — select one of the three plans (carries over via `?plan=slug` too).
3. **Account** — **Login** calls the real, existing LMS backend endpoint directly. **Register** is
   an honest, clearly-labeled placeholder (see [Authentication Handoff](#authentication-handoff)).
4. **Payment** — the honest payment boundary (see below).

Non-sensitive selection state (`programSlug`, `planSlug`, current `step`) is persisted to
`sessionStorage` via `hooks/useApplicationState.ts` — survives a page refresh. Auth state
(access token, applicant identity) lives in component state only, **never** persisted — a refresh
correctly requires signing in again, matching `frontend/`'s own security posture.

A persistent `ApplicationSummaryCard` (Program / Plan / Duration / Price) sits in a sticky right
rail on desktop and a collapsible disclosure above the form on mobile.

## Authentication handoff

The website **never** builds a second user/password store. As of this build:

- `POST {VITE_API_BASE_URL}/auth/login` **exists** on the backend and is authoritative —
  `services/auth-service.ts#login()` calls it directly with `credentials: 'include'`, mirroring
  `frontend/`'s exact contract: the refresh token is an httpOnly cookie the website's JS never
  touches; the access token is returned in the response body and **must** be kept in memory only
  by the caller (`AccountStep.tsx` does this — never localStorage/sessionStorage).
- **No public self-registration endpoint exists yet** (`backend/src/routes/auth.routes.ts` has no
  `/register`/`/signup` route; `User` is deliberately auth-identity-only, with no name/phone
  fields). `services/auth-service.ts#registerApplicant()` is therefore an honest placeholder —
  same simulated-latency pattern as `data/contact.ts` — and never claims an account was actually
  created. The Payment step shows a plain notice when this path was used
  ("our admissions team will confirm your account setup").
- **CORS**: `backend/.env`'s `CORS_ORIGINS` now includes this app's dev origin
  (`http://localhost:5174`) alongside `frontend/`'s (`http://localhost:5173`) so the Login call
  above actually works cross-origin in local dev. This is an additive, env-driven config change —
  no backend route or auth logic changed.

**Before self-registration can be wired up for real**, the backend needs: a public
`POST /api/v1/auth/register` endpoint, and `firstName`/`lastName`/`phone` fields added to (or
alongside) the `User` model.

## Payment integration boundary

**No payment gateway is integrated on the backend.** `Payment`/`Invoice` Mongoose models exist as
unused scaffolding (no routes, no controller, no service, no gateway SDK in
`backend/package.json`) — confirmed by inspection, not assumed.

Given that, `components/apply/steps/PaymentStep.tsx` is the honest stopping point: it shows the
full application summary and states plainly, "Payment integration will be connected in the Fees &
Payments phase." It never simulates a successful payment, never fabricates an order/Enrollllment
reference, and never marks anyone Enrolllled.

`components/apply/PaymentSuccessScreen.tsx` is built and ready for that future phase but is
**intentionally not wired into any reachable code path** — nothing in `ApplyPage.tsx` can render
it today. The future architecture it assumes:

```
Application → Order → Payment Gateway → Server-side Payment Verification
  → Successful Payment → Enrollllment → Receipt → LMS Access
```

Payment success must eventually be verified server-side — never trust a client-only
`?payment=success` callback. Do not connect `PaymentSuccessScreen` until that verification step
exists.

## Program ↔ LMS course mapping strategy

A public "program" (marketing/catalog copy) is not the same entity as an LMS "Course" (the real
academic entity with curriculum, batches, Enrollllments). `Program` has one optional field,
`courseId?: string`, left `undefined` until an admin links a program to a real course — no second
academic course system, no duplicated curriculum data. The full mapping the Application → LMS flow
will eventually need: `programSlug → courseId`, `planId → commercial offering`,
`userId → student/user account`, `payment → Enrollllment`. The website never writes an Enrollllment
record directly — that happens server-side, after verified payment.

## Image strategy

`public/images/` is organized by purpose, never scattered through `src/`:

```
public/images/
├── brand/      # (reserved — logo assets currently live in src/app/assets/)
├── hero/       # Homepage hero photo
├── programs/   # One distinct photo per program (hero + card image, same file, different crop)
├── students/   # Learning-together, hands-on training, coding close-up, student success
├── mentors/    # Trainer/mentor imagery
└── career/     # Career-prep and contact/advisor imagery
```

Every photographic image renders through `components/ui/ResponsiveImage.tsx` — explicit
`aspectRatio` (no layout shift), `loading="lazy"` by default, and `priority` (eager +
`fetchpriority="high"`) reserved for the single LCP image per page (the hero/program-hero image).
Every image ships with specific, real alt text — never empty, never generic "photo of student."

## SEO

Every route renders a `<Seo>` (title/description/keywords/canonical/Open Graph/Twitter) and, where
relevant, a `<JsonLd>` block built from `utils/structured-data.ts` (`EducationalOrganization`,
`Course`, `BreadcrumbList`, `FAQPage`). Structured data only ever reflects real content from
`data/*.ts` — nothing fabricated. `/apply` is `noIndex` (a checkout flow, not content) and excluded
from the sitemap and `robots.txt`. Plans intentionally do **not** use `Product` schema — that would
misrepresent a service as a physical product. `keywords` is a short, page-specific list, not a
stuffed one — modern search engines give the tag essentially no ranking weight; it's included
because it was asked for, not because it moves rankings. `index.html`'s own meta/OG/Twitter tags
are a static fallback for crawlers/link-unfurlers that never run JS — `<Seo>` overwrites all of
them once React mounts; keep the two in sync if the homepage's copy changes.

### Sitemap & robots.txt

`public/robots.txt` is static (allows everything except `/apply`, points to `/sitemap.xml`).
`sitemap.xml` **cannot** be static, though — Programs are live data from Course Management, not
content this repo owns. `scripts/generate-sitemap.ts` runs as a `postbuild` step (`npm run build`
→ `vite build` → this script): it combines the known static routes and Services (`data/services.ts`)
with every currently-published program, paginating through `GET /api/v1/public/programs` (never
assumes the catalog fits one page), and writes `dist/sitemap.xml`. If the backend is unreachable at
build time, it logs a warning and still writes the sitemap with just the static/Services routes —
a build never fails because the API happened to be down. Run `npm run sitemap` to regenerate it
standalone (e.g. against a local backend) without a full rebuild.

**Known limitation, not silently glossed over:** this only refreshes on a website _build_/deploy —
a program published on the LMS between deploys won't appear in the sitemap until the next one.
True real-time freshness would need the sitemap served dynamically (e.g. from the backend itself),
which is a separate infra decision (a new backend route, Nginx routing) not made here.

## Environment

| Variable            | Purpose                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_LMS_URL`      | Base URL of `../frontend/` — "Student Login" and the post-payment "Go to Student Portal" CTA route here                                                      |
| `VITE_SITE_URL`     | This site's own canonical URL, used to build absolute OG/canonical links                                                                                     |
| `VITE_API_BASE_URL` | Base URL of the LMS backend API — used by `services/auth-service.ts`'s real Login call **and** `services/public-programs-service.ts`'s program-catalog calls |

See `.env.example`. All three fall back to local dev defaults if unset.

## Known gap: `App.test.tsx`

The existing integration test suite (`src/app/__tests__/App.test.tsx`) predates the dynamic-programs
migration and asserts against the old static routing/nav (`/services` as the training-programs
route, category filter values like `"Design"`, etc.). Per this task's own scope (no test-suite work
this pass — see the task's Testing Policy), it was not run or updated here; it will need a rewrite
similar in spirit to the routing/nav test updates from the earlier Services/Programs redesign
before it's trustworthy again.

## Data layer

Two services call a real LMS backend endpoint: `auth-service.ts` (the `/apply` flow's real Login
call) and `public-programs-service.ts` (the entire training-programs catalog — see "Programs
architecture" above). Everything else in `data/*.ts` is static content this repo owns directly
(Plans, Services, Trainers, Testimonials, the homepage's batch teaser, FAQ) and stays that way
until/unless a future phase gives it a real backend module of its own. Pages consume both static
and dynamic data the same way — React 19's `use()` inside a `<Suspense>` boundary, not manual
loading-state effects; the dynamic ones additionally wrap that `<Suspense>` in a
`ProgramsErrorBoundary` so a real API failure shows a retry UI, never a blank page.
