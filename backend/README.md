# Daisy Minds LMS — Backend

Express.js + TypeScript API. Implemented business modules: **Authentication & Authorization** (`/auth`), **Admin User Management** (`/users`, `/roles`), **Admin Student Management** (`/students`), **Admin Trainer Management** (`/trainers`), **Admin Dashboard** (`/dashboard`), **Admin Course Management** (`/courses`), **Curriculum Builder** (`/courses/:courseId/curriculum`, `/modules`, `/lessons`), and **Learning Content Management** (`/courses/:courseId/modules/:moduleId/lessons/:lessonId/content`, `/resources`, `/courses/:courseId/launch-readiness`) — see [Modules](#modules) below. See [../CLAUDE.md](../CLAUDE.md), [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md), [../docs/API-STANDARDS.md](../docs/API-STANDARDS.md), and [../docs/SECURITY.md](../docs/SECURITY.md) before adding code.

## Technology Stack

Node.js · Express.js 5 · TypeScript (strict) · MongoDB Atlas · Mongoose · Redis (ioredis) · BullMQ · Cloudinary SDK · Zod · Pino · Swagger/OpenAPI (`@asteasolutions/zod-to-openapi` + `swagger-ui-express`) · Helmet · express-rate-limit · Vitest + Supertest · ESLint + Prettier.

## Folder Structure

```
src/
├── server.ts        # process entry — starts the HTTP server + infra connections, graceful shutdown
├── app.ts             # Express app assembly (middleware chain, route mounting) — exported, not started
├── config/             # env (Zod-validated), database, redis, cloudinary, logger, swagger
├── controllers/         # thin request handlers
├── services/              # business logic
├── repositories/            # Mongoose data access
├── models/                    # Mongoose schemas
├── routes/                      # Express Routers
├── middlewares/                  # error-handler, not-found, request-id, request-logger, validate, rate-limit
├── validators/                     # Zod request-validation schemas
├── types/                            # shared TypeScript types (incl. Express Request augmentation)
├── utils/                              # api-error, api-response, async-handler
├── queues/                              # BullMQ connection options + queue factory
├── jobs/                                  # BullMQ processors (none yet)
└── docs/                                    # OpenAPI path registrations
tests/
├── unit/
└── integration/
scripts/
```

Business modules are organized by feature within each layer (e.g. `controllers/user.controller.ts`, `services/user-management.service.ts`) — see ARCHITECTURE.md §3.

## Modules

| Module | Routes | Status |
|---|---|---|
| Auth | `/api/v1/auth/*` | Implemented (Phase 2) — login/refresh/logout/change-password/forgot-reset-password/verify-email/sessions. See SECURITY.md §1. |
| Admin User Management | `/api/v1/users/*`, `/api/v1/roles` | Implemented (Phase 2 extension) — CRUD, lifecycle (activate/deactivate/soft-delete/restore), role assignment, sessions, audit timeline, bulk actions, CSV export. `ADMIN`/`SUPER_ADMIN` only. See ARCHITECTURE.md §14, SECURITY.md §3. |
| Admin Student Management | `/api/v1/students/*` | Implemented (Phase 5's student half, built as a Phase 6 pass) — CRUD, lifecycle, sessions, audit timeline, bulk actions, CSV export, server-generated `studentId`, profile-photo upload. `ADMIN`/`SUPER_ADMIN` only; sessions/audit `SUPER_ADMIN`-only. See ARCHITECTURE.md §15, DATABASE.md §3.2, SECURITY.md §3/§6. |
| Admin Trainer Management | `/api/v1/trainers/*` | Implemented (Phase 5's trainer half, built as a Phase 7 pass) — CRUD, lifecycle, sessions, audit timeline, bulk actions, CSV export, server-generated `trainerId`, weekly recurring availability with overlap detection, qualifications/certifications, employment info, profile-photo upload. `ADMIN`/`SUPER_ADMIN` only; sessions/audit `SUPER_ADMIN`-only. See ARCHITECTURE.md §17, DATABASE.md §3.2, SECURITY.md §3/§6. |
| Admin Dashboard | `/api/v1/dashboard/*` | Implemented (Phase 8, `publishedCourses` metric added in Phase 9A) — operational summary metrics/distributions/recent records/alerts computed live from `users`/`students`/`trainers`/`courses`/`audit_logs` (no new collection), timezone-aware date-range support, 60s best-effort Redis cache. `ADMIN`/`SUPER_ADMIN` only (`dashboard:read`); the audit-derived `recentActivity` feed is `SUPER_ADMIN`-only within that same response. No batch/enrolment/attendance/payment/certificate/placement analytics — those modules don't exist yet. See ARCHITECTURE.md §18, SECURITY.md §3/§4/§5/§8. |
| Admin Course Management | `/api/v1/courses/*` | Implemented (Phase 9A) — course-level metadata and lifecycle only (create/update/publish/unpublish/archive/restore/soft-delete), server-generated `courseCode`, slug management, pricing metadata (no payment gateway), thumbnail/banner upload, trainer-eligibility metadata, publication-readiness gating, bulk actions, CSV export, audit timeline. `ADMIN`/`SUPER_ADMIN` only (`courses:read`/`courses:manage`/`courses:publish`/`courses:export`). No batches/enrolment/certificates/payments — those modules don't exist yet. See ARCHITECTURE.md §19, DATABASE.md §3.3, SECURITY.md §3/§4/§6/§8. |
| Curriculum Builder | `/api/v1/courses/:courseId/curriculum`, `/modules/*`, `/lessons/*` | Implemented (Phase 9B) — module/lesson structure and ordering only (create/update/archive/restore/publish/unpublish/soft-delete/duplicate, reorder, move a lesson between modules, prerequisite metadata with cycle detection, structural curriculum readiness). Reuses `courses:read`/`courses:manage`/`courses:publish` — no new permissions. See ARCHITECTURE.md §20, DATABASE.md §3.3, SECURITY.md §3/§4/§8. |
| Learning Content Management | `/api/v1/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/*`, `/resources/*`, `/api/v1/courses/:courseId/launch-readiness` | Implemented (Phase 9C) — lesson-content authoring for `VIDEO`/`TEXT`/`DOCUMENT`/`EXTERNAL_LINK` lesson types: signed direct-to-Cloudinary video/document upload with independent Admin-API re-verification, sanitized rich-text (`sanitize-html`), server-validated external links, downloadable lesson resources (reorderable, capped per lesson), server-computed content readiness, and course launch readiness (composing course metadata + curriculum structure + content readiness). Reuses `courses:read`/`courses:manage` — no new permissions. Malware scanning for uploaded resources is an explicit, documented gap — see SECURITY.md §6. No student learning player, progress tracking, quizzes, assignments, or live classes — those modules don't exist yet. See ARCHITECTURE.md §21, DATABASE.md §3.3, SECURITY.md §3/§4/§6/§8. |
| Admin Batch Management | `/api/v1/batches/*` | Implemented (Phase 10A) — a batch is a scheduled delivery instance of a course: CRUD (create/update/soft-delete/restore/duplicate), server-generated `batchCode`, an explicit lifecycle state machine (`DRAFT`/`SCHEDULED`/`ACTIVE`/`COMPLETED`/`CANCELLED`/`ARCHIVED`, transitions only via `POST /:id/lifecycle/{action}`), backend-authoritative scheduling readiness, primary/assistant trainer assignment with availability/cross-batch-conflict detection, a recurring weekly timetable + calendar exceptions (`POST /:id/weekly-schedule`, `POST /:id/calendar-exceptions` — whole-array replace, not `PUT`), mode-aware location config, bulk actions, CSV export, audit timeline. `ADMIN`/`SUPER_ADMIN` only (`batches:read`/`batches:manage`/`batches:export`). Capacity is **configuration only** — no enrolled-count/seat field exists, since no enrolment module exists yet. See ARCHITECTURE.md §22, DATABASE.md §3.3, SECURITY.md §3/§4/§8. |
| Student Enrollment Engine | `/api/v1/enrollments/*`, `/api/v1/batches/:id/capacity`, `/api/v1/batches/:id/waitlist` | Backend implemented (Phase 10B Part 1) — **no admin UI yet (Part 2)**. An enrollment is a student's membership in one batch: server-generated `enrollmentCode`, an 8-status lifecycle (`PENDING`/`WAITLISTED`/`CONFIRMED`/`ACTIVE`/`SUSPENDED`/`COMPLETED`/`CANCELLED`/`DROPPED`, transitions only via dedicated endpoints), a transactional capacity/waitlist engine (`batches.occupiedSeats`/`waitlistSequence`, atomic `$expr`-guarded seat reservation — race-tested under concurrency), same-batch/same-course duplicate prevention, atomic same-course transfer, a reusable `hasLearningAccess` entitlement rule, bulk enroll/suspend/resume/cancel, CSV export, audit timeline. `ADMIN`/`SUPER_ADMIN` only (`enrollments:read`/`enrollments:manage`/`enrollments:export`); the capacity-reconcile maintenance endpoint is `SUPER_ADMIN`-only. See ARCHITECTURE.md §23, DATABASE.md §3.4, SECURITY.md §3/§4/§8. |
| Student Portal | `/api/v1/student/dashboard`, `/enrollments/*`, `/courses/*`, `/schedule`, `/resources/*`, `/profile` | Implemented (Phase 11A) — the first self-scoped `STUDENT`-facing surface, gated on `requireRole('STUDENT')` alone (no permission-catalog entries apply). Every route resolves identity from `req.user.id`, never a client-supplied `studentId`. Dashboard/enrollment-list/course-overview/derived weekly-schedule/resource-list-with-on-demand-signed-URLs/self-service profile read+narrow update. See ARCHITECTURE.md §25's neighboring §, DATABASE.md, SECURITY.md §3/§4/§6. |
| Learning Player | `/api/v1/student/courses/:courseId/progress`, `/lessons/:lessonId`, `/lessons/:lessonId/media`, `/lessons/:lessonId/progress`, `/lessons/:lessonId/complete` | Implemented (Phase 11B) — course → module → lesson consumption, lesson progress, course-completion percentage, prerequisite enforcement, and resume-learning. A single `student-lesson-access.service.ts` gates every route (entitlement + published-only + prerequisite-lock resolution, never duplicated per controller). Video auto-completes at 90% watched (server-verified against the lesson's own Cloudinary duration, never a client-supplied one); text/document/external-link complete manually, idempotently. No quizzes/assignments/live-classes/attendance/payments/certificates — those remain future phases. See ARCHITECTURE.md §26, DATABASE.md §3.4, SECURITY.md §3/§4/§6/§8. |
| Live Classes | `/api/v1/live-classes/*`, `/api/v1/student/live-classes/*`, `/api/v1/trainer/live-classes/*` | Implemented (Phase 12) — evolves `batches.weeklySchedule` (a recurring template) into real, individually-manageable session records. Manual creation and generate-from-timetable (preview then create, reusing Phase 11A's `generateUpcomingOccurrences()` unchanged), a named-transition lifecycle (`DRAFT`/`SCHEDULED`/`LIVE`/`COMPLETED`/`CANCELLED`, never a generic `PATCH`), indexed trainer-conflict and batch-date-range checks (overridable only with an audited reason), and a `LiveMeetingProvider` adapter (`MANUAL_LINK` is the only real implementation — no managed video-conferencing vendor is integrated yet, ARCHITECTURE.md §9). Student join is a dedicated, entitlement- and 15-minute-join-window-checked endpoint that never appears in the broad list DTO; trainer self-service (`/trainer/live-classes/*`) is ownership-checked (`primaryTrainerId`/`trainerIds`), not a permission grant. `ADMIN`/`SUPER_ADMIN` via `live_classes:read`/`live_classes:manage`. See ARCHITECTURE.md §27, DATABASE.md's `live_classes` entry, SECURITY.md §3/§4/§8. |
| Attendance | `/api/v1/attendance/*`, `/api/v1/live-classes/:id/attendance*`, `/api/v1/student/attendance`, `/api/v1/trainer/live-classes/:id/attendance` | Implemented (Phase 12, alongside Live Classes) — a roster-based attendance workflow hanging off each real `live_classes` session, never a bare per-date record. Roster-first, never pre-marked: an eligible student (enrollment `ACTIVE`/`CONFIRMED` for the session's batch) with no attendance document is a derived `UNMARKED` state; records are only ever written by an explicit bulk-mark (one `bulkWrite`, never per-student) or, for whoever's still unmarked, on finalize. `attendanceStatus: OPEN`/`FINALIZED` lives on the session; once finalized, edits are rejected until an `ADMIN`/`SUPER_ADMIN` explicitly reopens it (reason required, audited) — a trainer can mark but never finalize/reopen. Percentage is one shared formula (`(present + late) ÷ (finalizedSessions − excused)`), computed fresh, never stored. `ADMIN`/`SUPER_ADMIN` via `attendance:read`/`attendance:manage`/`attendance:export`; `TRAINER` self-service is ownership of the parent session. See ARCHITECTURE.md §27, DATABASE.md's `attendance` entry, SECURITY.md §3/§4/§8. |

Every other module (attendance, quizzes, assignments, live classes, …) is pending — see [../docs/ROADMAP.md](../docs/ROADMAP.md).

## Prerequisites

- Node.js ≥ 20.19 (repo tested against 22.12 — see the root `.nvmrc`/`nvm use`)
- A MongoDB Atlas cluster (or local MongoDB for development)
- A Redis instance (local `redis-server` is fine for development)
- A Cloudinary account (free tier is sufficient for development)

## Environment Setup

```bash
cp .env.example .env
```

Fill in `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and **`JWT_ACCESS_SECRET`** (required, ≥32 characters — generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) with real values. Every variable is validated at startup with Zod (`src/config/env.schema.ts`) — the process exits immediately with a clear message if anything required is missing or malformed, rather than failing unpredictably later. See `.env.example` for the full list and defaults.

Note: nothing here is loaded automatically by `npm run dev`/`tsx` — either export these into your shell yourself, or run with Node's built-in loader: `node --env-file=.env node_modules/.bin/tsx watch src/server.ts`.

## Local Development

```bash
npm install
npm run dev          # tsx watch — auto-restarts on file changes
```

The server logs its listening port and environment on startup. `/api/v1/health` is a good first request to confirm it's up.

## MongoDB Atlas Setup

1. Create a free/shared cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Add your IP (or `0.0.0.0/0` for local dev only, never for a production cluster) to the Atlas Network Access list.
3. Create a database user and copy the SRV connection string into `MONGODB_URI` in `.env`.
4. Staging and production must use **separate Atlas projects/clusters**, never the same one (DEPLOYMENT.md §1).

## Redis Setup

Local development: `brew install redis && redis-server`, or `docker run -p 6379:6379 redis`. Default `REDIS_URL=redis://127.0.0.1:6379` in `.env.example` matches this. In production, Redis is self-hosted on the same VPS as the API (DEPLOYMENT.md §7).

## Cloudinary Setup

Create a free account at [cloudinary.com](https://cloudinary.com), copy the Cloud Name, API Key, and API Secret from the dashboard into `.env`. `src/services/cloudinary-upload.service.ts` (signed upload/verify/delete) and `src/services/media-delivery.service.ts` (short-lived signed delivery URLs) are the only places that talk to Cloudinary directly — used by course thumbnail/banner, student/trainer profile photos, and (Phase 9C) lesson video/document/resource uploads. `MAX_VIDEO_UPLOAD_MB`/`MAX_DOCUMENT_UPLOAD_MB`/`MAX_RESOURCE_UPLOAD_MB`/`MAX_RESOURCES_PER_LESSON` (see `.env.example`, all have generous defaults) govern the Phase 9C upload limits.

## Swagger / API Docs

`GET /api/docs` — interactive OpenAPI 3 documentation, generated from the same Zod schemas that validate requests (`src/docs/`). Enabled by default outside production; disabled by default in production unless `SWAGGER_ENABLED=true` is set explicitly.

## Health Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/health/live` | Liveness — confirms the Node.js process is running |
| `GET /api/v1/health/ready` | Readiness — checks MongoDB + Redis connectivity and Cloudinary config; `503` if anything required is unavailable |
| `GET /api/v1/health` | Summary — app name, version, environment, uptime, timestamp, dependency status |

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

Tests import `src/app` (never `src/server`), so no real MongoDB/Redis/Cloudinary connection is ever attempted — `connectDatabase()`/`connectRedis()` are only called from `server.ts`'s `bootstrap()`. `/health/ready` tests assert the (accurate) `503`/`unavailable` response you get with no live infra behind the test run.

## Build & Production

```bash
npm run build   # tsc -> dist/
npm start       # node dist/server.js
```

In production this process runs under PM2 in cluster mode behind Nginx (DEPLOYMENT.md §4–5); `TRUST_PROXY` must reflect the number of proxy hops in front of it so rate limiting and `req.ip` see the real client address, not Nginx's.

## Other Scripts

`lint` / `lint:fix` · `format` / `format:check` · `typecheck` · `audit` (`npm audit --audit-level=high`).

## Security Notes

- `.env` is gitignored; `.env.example` contains **no real secrets**, only placeholders.
- Every response uses one of two consistent envelopes (API-STANDARDS.md §3) — stack traces and raw database errors are never sent to the client in production (`middlewares/error-handler.middleware.ts`).
- `NoSQL injection` and `HTTP parameter pollution` protection come from strict Zod schemas (`.strict()` on every request-validation schema) rather than `express-mongo-sanitize`/`hpp` — both packages mutate `req.query`, which Express 5 makes read-only, and neither is actively maintained enough to justify the risk. See ARCHITECTURE.md and SECURITY.md.
- Authentication (JWT, refresh tokens, RBAC) is implemented — see ROADMAP.md Phase 2 and SECURITY.md §1/§3. Every route added from here forward defaults to protected per API-STANDARDS.md §6's router-mounting-order convention (`requireAuth` applied before the router is mounted, or router-wide inside it, as `/users` and `/roles` do).
