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
│   ├── layout/       # Navbar (+ ServicesMegaMenu), Footer, SiteChrome
│   ├── marketing/    # ProgramCard, PlanCard, ProgramIcon, TrainerCard, TestimonialCard…
│   ├── apply/        # The /apply stepper: StepperNav, ApplicationSummaryCard, steps/*, PaymentSuccessScreen
│   ├── seo/          # <Seo>, <JsonLd>
│   └── motion/       # Reveal, Stagger, FloatingCard, shared variants
├── data/             # Static content + async "repository" functions —
│                       shaped like the eventual GET /api/v1/public/* endpoints
│                       so swapping in a real fetch later needs no call-site change
├── services/         # auth-service.ts — the one place that calls a real backend endpoint
├── hooks/            # useApplicationState (apply-flow selection persistence), usePrefersReducedMotion…
├── pages/            # Route-level components
├── sections/         # Homepage narrative sections (one concern each)
├── styles/           # Design tokens (index.css)
├── types/
└── utils/
```

## Programs architecture

`types/program.ts` defines `Program` — shaped like the eventual `GET /api/v1/public/programs` /
`GET /api/v1/public/programs/:slug` response. `data/programs.ts` holds the nine current programs
(Web Development, Android Development, Cybersecurity, Artificial Intelligence, Data Science, Data
Analytics, DevOps, Cloud Computing, Digital Marketing) and exposes only async accessors
(`getPrograms`, `getProgramBySlug`, `getFeaturedPrograms`, `getProgramCategories`) — components
never import the raw array, so swapping in a real fetch later is a one-file change.

Content rules baked into every program's copy: no invented exact module/lesson counts (see
`curriculumHighlights`, which describes learning _areas_, not a lesson-by-lesson syllabus), no
unsupported certification/hacking claims (Cybersecurity in particular), no salary guarantees
(`careerOpportunities`), and "Placement Assistance" — never "100% placement" or "guaranteed job."

`icon` is a serializable `ProgramIconName` string, resolved to a real `lucide-react` icon only at
render time via `components/marketing/ProgramIcon.tsx` — keeps the data layer free of React
component references.

**Canonical route:** `/services/:slug` (reusable `ProgramDetailPage`, 11 sections: Hero, Overview,
What You Will Learn, Curriculum Highlights, Tools & Technologies, Hands-on Learning, Career
Opportunities, Why Learn at Daisy Minds, Choose Your Learning Path, FAQ, Final CTA). The old
`/programs` and `/programs/:slug` URLs still work — `App.tsx` redirects them to `/services` and
`/services/:slug` respectively, so no old link or bookmark breaks.

## Plans architecture

`types/plan.ts` / `data/plans.ts` hold the three learning-path tiers (Short Term Foundation
Modules / Specialized & Mid Level Training / Advanced Job-Ready Bootcamps) — one source of truth
for pricing and features; never hardcode a price anywhere else. `getPlans()`/`getPlanBySlug()`/
`getPlanById()` follow the same async-placeholder pattern as programs. `formatPlanPrice()` is the
one place INR formatting happens.

Plans are a commercial/depth tier independent of any single program's own `duration`/`level`
fields — the same three plans apply across all nine programs.

## Application flow (`/apply`)

A four-step stepper (Program → Plan → Account → Payment), built in `components/apply/`:

1. **Program** — shows the program carried over via `?program=slug` (changeable), or prompts a
   selection from all nine if none was provided.
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
Payments phase." It never simulates a successful payment, never fabricates an order/enrollment
reference, and never marks anyone enrolled.

`components/apply/PaymentSuccessScreen.tsx` is built and ready for that future phase but is
**intentionally not wired into any reachable code path** — nothing in `ApplyPage.tsx` can render
it today. The future architecture it assumes:

```
Application → Order → Payment Gateway → Server-side Payment Verification
  → Successful Payment → Enrollment → Receipt → LMS Access
```

Payment success must eventually be verified server-side — never trust a client-only
`?payment=success` callback. Do not connect `PaymentSuccessScreen` until that verification step
exists.

## Program ↔ LMS course mapping strategy

A public "program" (marketing/catalog copy) is not the same entity as an LMS "Course" (the real
academic entity with curriculum, batches, enrollments). `Program` has one optional field,
`courseId?: string`, left `undefined` until an admin links a program to a real course — no second
academic course system, no duplicated curriculum data. The full mapping the Application → LMS flow
will eventually need: `programSlug → courseId`, `planId → commercial offering`,
`userId → student/user account`, `payment → enrollment`. The website never writes an enrollment
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

Every route renders a `<Seo>` (title/description/canonical/Open Graph/Twitter) and, where
relevant, a `<JsonLd>` block built from `utils/structured-data.ts` (`EducationalOrganization`,
`Course`, `BreadcrumbList`, `FAQPage`). Structured data only ever reflects real content from
`data/*.ts` — nothing fabricated. `/apply` is `noIndex` (a checkout flow, not content). Plans
intentionally do **not** use `Product` schema — that would misrepresent a service as a physical
product.

## Environment

| Variable            | Purpose                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `VITE_LMS_URL`      | Base URL of `../frontend/` — "Student Login" and the post-payment "Go to Student Portal" CTA route here |
| `VITE_SITE_URL`     | This site's own canonical URL, used to build absolute OG/canonical links                                |
| `VITE_API_BASE_URL` | Base URL of the LMS backend API — used only by `services/auth-service.ts`'s real Login call             |

See `.env.example`. All three fall back to local dev defaults if unset.

## Data layer

Nothing here calls an authenticated LMS admin endpoint (the one exception, by design, is the real
`/auth/login` call described above). Every function in `data/*.ts` returns a `Promise` shaped like
the eventual public API (`/api/v1/public/programs`, `/api/v1/public/plans`,
`/api/v1/public/trainers`, `/api/v1/public/batches`) — today they resolve static content instead
of making a network call. Pages consume them with React 19's `use()` inside a `<Suspense>`
boundary, not manual loading-state effects.
