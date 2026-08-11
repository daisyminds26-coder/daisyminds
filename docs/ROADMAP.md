# Daisy Minds LMS — Product Roadmap

This roadmap implements the PRD's 20-phase plan (PRD §16), restructured to address two sequencing risks identified in [PROJECT-UNDERSTANDING-REPORT.md](./PROJECT-UNDERSTANDING-REPORT.md) §4:

1. **Security is continuous, not a single late-stage phase.** Every phase below carries its own security exit criterion (auth/permission checks, input validation, audit logging for that phase's modules) in addition to a dedicated Phase 19 hardening pass. Phase 19 is a *penetration-test-and-harden* gate, not the first time security is considered.
2. **Notifications is scaffolded early**, not built last, because Attendance, Assignments, Fees, and Live Classes all depend on it for the *domain events* they emit (ARCHITECTURE.md §5), even before every delivery channel (email/SMS/push) is finalized.

Each phase lists objective, deliverables, exit criteria, and its blocking dependencies/open decisions.

---

### Phase 1 — Project Setup & Architecture
**Objective:** Establish the technical foundation every later phase depends on.
**Deliverables:** Backend/frontend scaffolds per ARCHITECTURE.md's folder structure; typed config module with env validation; CI/CD pipeline (DEPLOYMENT.md §3); base error-handling/response-envelope infrastructure (API-STANDARDS.md §3); ESLint/Prettier/Husky setup (CODING-STANDARDS.md).
**Exit criteria:** CI pipeline green on an empty scaffold; lint/build/test all runnable locally and in CI.
**Blocking decisions:** none — this phase can start immediately.

### Phase 2 — Authentication & Authorization — **Implemented (backend + frontend)**
**Objective:** JWT auth, refresh-token rotation, RBAC middleware — and, once the Phase 3 frontend foundation existed, the real frontend integration against it.
**Deliverables (backend — done):** `auth` and `users` modules (DATABASE.md §2.1); login/refresh/logout/change-password/forgot-reset-password/verify-email/sessions endpoints; `requireAuth`/`requireRole`/`requirePermission`/`requireOwnership` middleware; audit logging for auth events; `ACCOUNT_LOCKED` error code + `lockedUntil` detail (added during frontend integration once the original `401 UNAUTHORIZED`-for-everything shape proved indistinguishable from a wrong password client-side).
**Deliverables (frontend — done):** `features/auth/` module (API client with automatic refresh-and-retry, Zustand token store, TanStack Query profile cache, RHF+Zod forms); real `RequireAuth`/`RequireGuest`/`RequireRole`/`RequirePermission` guards; Login/Forgot/Reset/Verify-Email pages wired to the live API; Account & Security page (change password + session management); multi-tab logout sync. See ARCHITECTURE.md §4.2, SECURITY.md, and `frontend/README.md`'s Authentication section for the full design.
**Exit criteria:** All four roles can authenticate end-to-end through the real UI ✅; permission tests confirm role boundaries (CODING-STANDARDS.md §6) ✅; refresh-token rotation and reuse-detection verified (SECURITY.md §1) ✅; frontend refresh-queue deduplication/no-infinite-loop verified by test ✅.
**Blocking decision:** MFA for `SUPER_ADMIN`/`ADMIN` — ⚠ still not implemented; `users.mfaEnabled`/`mfaSecret` fields are reserved but unused. Confirm before treating this phase as fully closed, since retrofitting MFA onto an existing login flow (frontend and backend both) is more disruptive than building it in now.

**Extension — Admin User Management — Implemented:** built ahead of schedule, directly on top of this phase's `users`/`roles` collections, to give `SUPER_ADMIN`/`ADMIN` operational control over system-user accounts (create/edit/activate/deactivate/soft-delete/restore, role assignment, session view/force-logout, audit timeline, bulk actions, CSV export) before any profile-data module exists. See ARCHITECTURE.md §14, SECURITY.md §3, and API-STANDARDS.md for the full design and privilege-escalation guards. **This is not the same work as Phase 5 below** — it manages the base `users` identity/auth record only; `studentProfiles`/`trainerProfiles` (Phase 5) remain unbuilt.

### Phase 3 — Frontend Foundation (shell + component library) — **Implemented (frontend half)**
**Objective:** Ship the full application shell early so every subsequent phase has somewhere to surface its UI, and stand up the Notifications module's event-listener/queue skeleton (ARCHITECTURE.md §11) so later phases can emit events into it immediately, even with a stubbed `LogAdapter` channel.
**Deliverables (frontend — done):** Role-aware Admin/Trainer/Student dashboard shells and navigation (ARCHITECTURE.md §4/§4.1); the full reusable UI/design-system component library (layout, feedback, data-display, forms, overlays, containers); lazy-loaded, guarded routing for all three areas plus public auth pages and 404/403/500/maintenance/coming-soon; Login/Forgot/Reset Password pages (originally UI-only — since wired to the real API as part of Phase 2's frontend integration, see above and ARCHITECTURE.md §4.2).
**Deliverables (backend — still pending):** `notifications` module with `EMAIL`/`SMS`/`PUSH`/`IN_APP` channel interface and a working `LogAdapter`.
**Exit criteria:** Dashboard shell renders per-role navigation correctly ✅; a test event can be emitted and observed reaching the notification queue end-to-end — pending the backend half.
**Blocking decision:** Email/SMS vendor selection can happen later — the adapter interface means it doesn't block this phase.
**Explicitly not built this phase (per instruction):** API wiring, real authentication state/session store, Student/Course Management business logic.
**Admin Dashboard content — implemented as a later build pass (informally "Phase 8" in this project's build sequence):** the Admin Dashboard *shell* (empty stat-card/chart-placeholder mockup) shipped here in Phase 3; the real, backend-driven operational dashboard — user/student/trainer summary metrics, distributions, recent records, a permission-gated audit-activity feed, and operational alerts, built once User/Student/Trainer Management existed to have real data to summarize — replaced that placeholder afterward. See ARCHITECTURE.md §18, DATABASE.md's dashboard note, SECURITY.md, and API-STANDARDS.md for the full design. Explicitly out of scope for that pass: any course/batch/enrollment/attendance/assignment/examination/fee/payment/certificate/placement analytics — none of those modules exist yet. **Phase 9A build added exactly one further, honest count** (`publishedCourses`, a secondary stat once Course Management shipped) — still no enrolment/completion/revenue/attendance/popularity analytics, since none of those modules exist yet either.

### Phase 4 — Course & Curriculum Management — **All three halves implemented (Phase 9A + Phase 9B + Phase 9C builds)**; the learning player and progress tracking still pending
**Objective:** Course catalog, curriculum tree, and lesson content.
**Deliverables:** `courses`, `curriculumModules`, `lessons` modules; Cloudinary signed-upload integration for lesson media (SECURITY.md §6).
**Exit criteria:** Full CRUD + publish workflow; indexing plan from DATABASE.md §2.2 applied and verified against real query patterns.

**Course-metadata deliverable — done (Phase 9A build):** Admin-managed `courses` CRUD (create/update/publish/unpublish/archive/restore/soft-delete), server-generated `courseCode`, slug management, pricing metadata (no payment gateway), thumbnail/banner upload, trainer-eligibility metadata (not real assignment), publication-readiness gating, bulk actions, CSV export, and audit timeline. Unlike the student/trainer deliverables above, a course is not a `users` document — this is a standalone, self-contained module, not an extension of Phase 2's `users` module. See ARCHITECTURE.md §19, DATABASE.md §3.3, SECURITY.md §3/§4/§6/§8 for the full design.
**Curriculum-structure deliverable — done (Phase 9B build):** Admin-managed `course_modules`/`lessons` CRUD (create/update/archive/restore/publish/unpublish/soft-delete/duplicate), drag-and-drop (plus fully keyboard-accessible) reordering within a module and moving a lesson between modules, lesson prerequisite metadata with cycle detection, cascading module-delete with tombstoned-lesson restore, structural curriculum readiness distinct from course metadata readiness, and a dedicated Curriculum Builder page. Reuses the existing `courses:read`/`courses:manage`/`courses:publish` permissions and the existing course audit timeline — no new permission catalog entries or audit endpoint. See ARCHITECTURE.md §20, DATABASE.md §3.3, SECURITY.md §3/§4/§8 for the full design.
**Learning-content deliverable — done (Phase 9C build):** Lesson-content authoring for `VIDEO`/`TEXT`/`DOCUMENT`/`EXTERNAL_LINK` lesson types — signed direct-to-Cloudinary video/document upload with independent Admin-API re-verification, sanitized rich-text (Tiptap + server-side `sanitize-html`), server-validated external links, downloadable lesson resources (`lesson_resources`, drag-and-keyboard-reorderable, capped at 20/lesson), server-computed content readiness, and a third "course launch readiness" concept composing course-metadata + curriculum-structure + content readiness. `QUIZ`/`ASSIGNMENT`/`LIVE_CLASS` remain honest structural placeholders (`contentStatus: NOT_CONFIGURED`), not fake forms. Reuses the existing `courses:read`/`courses:manage` permissions and the existing course audit timeline — no new permission catalog entries or audit endpoint. Malware/virus scanning for uploaded resources is an explicit, documented production-readiness gap (SECURITY.md §6) — no scanning provider is integrated yet. See ARCHITECTURE.md §21, DATABASE.md §3.3, SECURITY.md §3/§4/§6/§8 for the full design.
**Explicitly out of scope for what shipped:** the student learning player, lesson progress/completion tracking, quizzes, assignments, batches, enrollment, live classes, attendance, examinations, certificates, and payments — all remain genuinely future phases (Phase 6–13 below), not just deferred UI. `prerequisiteLessonIds` describes *intended* future sequencing; it neither delivers nor enforces an unlock flow yet.

### Phase 5 — Student & Trainer Management — **Both halves implemented (Phase 6 + Phase 7 builds)**
**Objective:** Profile management for the two primary end-user roles.
**Deliverables:** `studentProfiles`, `trainerProfiles` modules.
**Exit criteria:** Profile CRUD with field-level validation; audit logging on profile changes.
**Blocking decision:** ⚠ Minors/guardian-data handling and DPDP Act scope (SECURITY.md §7) must be confirmed *before* this phase collects real student PII — this is the last safe point to change the `studentProfiles` schema cheaply. **Resolved conservatively, not deferred:** the student module shipped without any guardian-data *requirement* (guardian fields are optional, exactly as this blocking decision anticipated) and without any government-ID (Aadhaar) field — see SECURITY.md §7. The DPDP question itself remains genuinely open; it just didn't need to block shipping admin-managed student/trainer profiles, since nothing built collects data whose lawfulness depends on the answer.

**Student deliverable — done:** Admin-managed `students` CRUD (create/update/activate/deactivate/soft-delete/restore/resend-invitation), sessions, audit timeline, bulk actions, CSV export, profile-photo upload, server-generated `studentId`, and a deterministic profile-completion score — built as an extension of the Phase 2 `users` module (a student *is* a `users` record + a `students` profile, not a separate account system) rather than a standalone module. See ARCHITECTURE.md §15, DATABASE.md §3.2, SECURITY.md §3/§6/§7 for the full design.
**Trainer deliverable — done (Phase 7 build):** Admin-managed `trainers` CRUD (create/update/activate/deactivate/soft-delete/restore/resend-invitation), sessions, audit timeline, bulk actions, CSV export, profile-photo upload, server-generated `trainerId`, weekly recurring availability with overlap detection, qualifications/certifications, employment info, and a deterministic profile-completion score — same architectural shape as the student deliverable, extending Phase 2's `users` module the same way. See ARCHITECTURE.md §17, DATABASE.md §3.2, SECURITY.md §3/§6/§7 for the full design.
**Also explicitly out of scope for what shipped** (per each build's own instructions, consistent with this phase's boundaries): Course Enrollment, Batch Allocation, Learning Progress, Attendance, Assignments, Examinations, Fees, Certificates, Placement, parent/guardian login accounts, public student/trainer self-registration, student/trainer self-service dashboard editing, course/batch assignment for trainers, live-class scheduling, trainer payroll, and government-ID storage for either role — all remain genuinely future phases, not just deferred UI.

### Phase 6 — Batch Management — **Implemented (Phase 10A build; operational polish in Phase 10C)**
**Objective:** Scheduling and capacity management for course delivery.
**Deliverables:** `batches` module; trainer-to-batch assignment.
**Exit criteria:** Batch CRUD with capacity enforcement.

**Deliverable — done (Phase 10A build):** Admin-managed `batches` CRUD (create/update/soft-delete/restore/duplicate), server-generated `batchCode`, an explicit lifecycle state machine (`DRAFT → SCHEDULED → ACTIVE → COMPLETED → ARCHIVED`, plus a `CANCELLED` branch), backend-authoritative scheduling-readiness checks, primary/assistant trainer assignment reusing courses' `eligibleTrainerIds` semantics, trainer availability/cross-batch-conflict detection, a recurring weekly timetable (local wall-clock time + IANA timezone, never UTC-converted) with calendar-exception dates, mode-aware location config (online/offline/hybrid), bulk actions, CSV export, and an 8-step Create Batch wizard plus a dedicated batch detail page (Overview/Schedule/Trainers/Settings/Audit tabs). "Capacity enforcement" above is realized as **configuration** this build (`maxStudents`/`minimumStudents`/`waitlistEnabled`) — there is no enrolled-count/seat-occupancy tracking yet, since no `enrollments` module exists (Phase 7 below); no batch anywhere fabricates one. New `batches:read`/`batches:manage`/`batches:export` permissions, `ADMIN`/`SUPER_ADMIN` only. See ARCHITECTURE.md §22, DATABASE.md §3.3, SECURITY.md §3/§4/§8, API-STANDARDS.md for the full design.
**Explicitly out of scope for what shipped:** student enrolment, a waiting list, batch transfer, a student roster, attendance, live-class sessions, the learning player, progress tracking, assignments, quizzes, examinations, fees, payments, certificates, and notifications — all remain genuinely future phases (Phase 7 onward below), not just deferred UI. A live-infrastructure action (seeding the `batches:*` permissions into the shared/production Atlas database via `scripts/seed-roles.ts`) was identified but deliberately **not executed** during this build — see the phase's own final report for the exact command and rollback.

**Deliverable — done (Phase 10C build — Batch Operations & Admin Productivity):** Batch Detail restructured into an operational workspace: Overview (compact real-data summary, a polished capacity widget, an operational-health checklist composed from existing readiness/conflict/course-readiness/launch-readiness services, and permission-scoped quick actions), Students (the former placeholder-lite tab upgraded into a searchable/filterable/paginated roster with status-gated row actions — Transfer/Suspend/Resume/Complete/Drop, all reusing Phase 10B's own lifecycle mutations — plus a Promote/Cancel waitlist panel), Schedule (a read-only weekly-timetable summary and a lightweight client-derived calendar of teaching/no-class dates, both non-persisted visualizations, not Live Class Management), Trainer (primary/assistant trainer summary with availability status and timetable-conflict indicator), Operations (the existing Settings form — including the already-present `internalNotes` editor — plus an Export Enrollment CSV action and honest "Available in a later phase" placeholders for Attendance/Live Classes/Assignments/Progress/Certificates), and Audit (unchanged). Zero backend endpoints were added — every new panel composes existing `batches`/`courses`/`enrollments` read endpoints; CSV export reuses the Phase 10B enrollment export scoped by `batchId`, and no new permissions were introduced (`batches:*`/`enrollments:*` only). No `ARCHITECTURE.md` change was needed — this build introduces no new backend contract or cross-cutting pattern. See `frontend/README.md`'s manual verification section.

### Phase 7 — Enrollment — **Implemented (Phase 10B Part 1 backend + Part 2 admin UI)**
**Objective:** Student enrollment into batches.
**Deliverables:** `enrollments` module with `PENDING_PAYMENT`/`ACTIVE` states (DATABASE.md §2.2).
**Exit criteria:** Enrollment flow works end-to-end **in test/sandbox payment mode** — full payment integration isn't due until Phase 14, but the enrollment↔payment state-machine contract must be defined now, not deferred, since it's a schema-shaping decision (see DATABASE.md §5 item 1).
**Blocking decision:** ⚠ Enrollment payment-gating rule (full vs. partial payment) — must be answered before this phase, not after. **Not yet needed:** Part 1 ships a payment-agnostic enrollment engine (`ADMIN`-created, no `PENDING_PAYMENT`-style gate) — the eventual payment integration (Phase 14) will need its own gating decision before a self-service/paid enrollment path is added, but nothing in the admin-driven flow built here depends on it.

**Deliverable — done (Phase 10B Part 2 build):** The admin Enrolment Operations UI against Part 1's backend contract, unmodified — enrolment list with search/filters/CSV export, a capacity-aware create wizard (distinct Confirmed/Waitlisted outcomes), status-gated lifecycle actions, waitlist promotion, same-course batch transfer, bulk enrolment (partial-result-safe) and bulk suspend/resume/cancel, an audit timeline, and lightweight roster/history integration on Batch Detail (Students tab) and Student Detail (Enrolment History tab). Three small additive backend refinements shipped alongside it: a derived `accessState` field on enrollment DTOs, real `occupiedSeats`/`availableSeats` on batch DTOs (batch list now shows "28/30", not Phase 10A's "Max 30"), and a guard preventing `maxStudents` from being configured below seats already occupied. **Explicitly out of scope, unchanged:** the Student Learning Portal, self-service enrolment, the Learning Player, progress/attendance/assignments/quizzes, fees/payments, and certificates. See ARCHITECTURE.md §24, `frontend/README.md`'s manual testing checklist for the full design and QA notes.

**Deliverable — done (Phase 10B Part 1 build):** A real (not the Phase 1 scaffold's) `enrollments` module — server-generated `enrollmentCode`, an 8-status lifecycle (`PENDING`/`WAITLISTED`/`CONFIRMED`/`ACTIVE`/`SUSPENDED`/`COMPLETED`/`CANCELLED`/`DROPPED`) with explicit lifecycle endpoints (never a generic PATCH), a transactional capacity/waitlist engine (`batches.occupiedSeats`/`waitlistSequence`, atomic `$expr`-guarded seat reservation — verified oversubscription-safe under concurrent last-seat requests), same-batch/same-course duplicate prevention, atomic same-course batch transfer, a reusable `hasLearningAccess` entitlement rule (`ACTIVE` or `COMPLETED`-with-open-access-window), bulk enroll/suspend/resume/cancel, CSV export, audit timeline, and new delete-protection guards added to the existing Batch/Course/Student management services. New `enrollments:read`/`enrollments:manage`/`enrollments:export` permissions, `ADMIN`/`SUPER_ADMIN` only. **No frontend UI shipped this part** — Part 2 builds the admin enrollment list/detail/wizard UI against this now-complete backend contract. See ARCHITECTURE.md §23, DATABASE.md §3.4, SECURITY.md §3/§4/§8 for the full design.
**Explicitly out of scope for what shipped:** the admin enrollment UI (Part 2), self-service/public student enrollment, any actual payment/fee gating, and wiring `enrollment-access.service.ts#assertStudentCourseAccess` into a real route (built, exported, unconsumed — ready for the Learning Player phase to import unchanged). A live-infrastructure action (seeding the `enrollments:*` permissions into the shared/production Atlas database via `scripts/seed-roles.ts`) was identified but deliberately **not executed** — see the phase's own final report for the exact command and rollback.

### Phase 8 — Learning Player
**Objective:** Video/document lesson consumption.
**Deliverables:** Signed video delivery (SECURITY.md §6); lesson viewer UI.
**Exit criteria:** A student can only access video for lessons in an `ACTIVE` enrollment; signed URLs expire correctly.
**Reuse note:** the signed-delivery mechanism itself (`media-delivery.service.ts#generateSignedDeliveryUrl`) already exists from Phase 9C's admin content-preview flow — this phase adds the enrollment-gated authorization check in front of it, not a second signing implementation.

### Phase 9 — Progress Tracking
**Objective:** Per-lesson and per-course completion tracking.
**Deliverables:** `lessonProgress` module, feeding course-completion percentage.
**Exit criteria:** Progress updates correctly on lesson completion; feeds into the (not-yet-built) `results` computation planned for Phase 13.

### Phase 10 — Live Classes
**Objective:** Scheduled real-time class delivery.
**Deliverables:** `live-classes` module built against the `LiveClassProviderAdapter` interface (ARCHITECTURE.md §9).
**Exit criteria:** A scheduled session can be created, joined by enrolled students/assigned trainer, and (if supported by the chosen vendor) recorded.
**Blocking decision:** ⚠ **Hard blocker** — live-class vendor selection (ARCHITECTURE.md §9) must be resolved before this phase starts; it cannot be scaffolded around indefinitely the way Notifications' vendor choice can.

### Phase 11 — Attendance
**Objective:** Per-session attendance capture.
**Deliverables:** `attendanceRecords` module, trainer-facing marking UI, notification on absence (consumes Phase 3's notification scaffold).
**Exit criteria:** Attendance percentage is queryable per student/batch; feeds the (still-undefined) exam-eligibility rule.
**Blocking decision:** ⚠ Minimum attendance % for exam eligibility (DATABASE.md §5 item — feeds `settings`).

### Phase 12 — Assignments
**Objective:** Assignment distribution, submission, grading.
**Deliverables:** `assignments`, `assignmentSubmissions` modules.
**Exit criteria:** Submission + grading flow works; late-submission handling matches the confirmed business rule.
**Blocking decision:** ⚠ Late-submission policy.

### Phase 13 — Quizzes & Examinations
**Objective:** Assessment delivery and results computation.
**Deliverables:** `quizzes`, `quizAttempts`, `examinations`, `examResults`, and the `results` aggregation (DATABASE.md §2.4) wired to the confirmed grading formula.
**Exit criteria:** Server-side time-boxing enforced on exams; results computed automatically from attendance + assignment + exam inputs.
**Blocking decision:** ⚠ Grading formula/weighting, retake policy — both hard blockers for this phase specifically (unlike earlier "soft" pending items, `results` literally cannot be implemented without these).

### Phase 14 — Fee & Payment Management
**Objective:** Full commercial flow, replacing Phase 7's sandbox-only payment path with live integration.
**Deliverables:** `feeStructures`, `invoices`, `payments` modules; `PaymentGatewayAdapter` (ARCHITECTURE.md §10); webhook idempotency handling (API-STANDARDS.md §8).
**Exit criteria:** Live payment reconciliation verified in the gateway's sandbox with real webhook retries/duplicates handled correctly; refund flow tested.
**Blocking decision:** ⚠ Payment gateway selection; GST invoicing requirement.

### Phase 15 — Certificates
**Objective:** Certificate generation and issuance.
**Deliverables:** `certificates` module; PDF generation job (ARCHITECTURE.md §6); non-guessable `certificateNumber` scheme (SECURITY.md §5).
**Exit criteria:** Certificate auto/admin-issued per the confirmed rule; revocation flow tested.
**Blocking decision:** ⚠ Auto-issue vs. admin-approval; revocation policy; any accreditation/format requirements.

### Phase 16 — Certificate Verification
**Objective:** Public certificate authenticity lookup.
**Deliverables:** `certificate-verification` module — public, rate-limited, minimal-field-exposure endpoint (SECURITY.md §5, §7).
**Exit criteria:** Enumeration/abuse testing passed; only non-sensitive fields exposed publicly.

### Phase 17 — Placement Management
**Objective:** Track student placement outcomes.
**Deliverables:** `placements` module, including the `consentGiven` capture flow.
**Exit criteria:** Consent is captured before any employer-facing data sharing occurs.
**Blocking decision:** ⚠ Employer-facing access model (is there an external role, or is sharing manual/off-platform for V1?).

### Phase 18 — Reports & Analytics
**Objective:** Cross-module reporting and dashboards.
**Deliverables:** `reports`, `analytics` modules; export jobs via BullMQ (ARCHITECTURE.md §6) to avoid blocking request threads on heavy aggregations.
**Exit criteria:** Report queries validated against production-scale data volume (or a realistic synthetic dataset) without degrading OLTP performance — this is the checkpoint where DATABASE.md's read-replica recommendation gets revisited if needed.

### Phase 19 — Security Hardening & Testing
**Objective:** Cross-cutting penetration test and hardening pass — **not** the first time security is addressed (every phase above has its own security exit criteria), but a dedicated adversarial pass across the whole system.
**Deliverables:** Full RBAC/permission-boundary test sweep across all modules; dependency vulnerability audit; rate-limit and enumeration testing on all public endpoints; load testing against PRD NFRs (DEPLOYMENT.md §10); incident-response runbook (SECURITY.md §10).
**Exit criteria:** No open critical/high findings; load test meets the 2,000+ concurrent / <300ms (p95, once defined) targets or a documented remediation plan exists.

### Phase 20 — Production Deployment
**Objective:** Go-live.
**Deliverables:** Production VPS/Atlas cluster provisioned (DEPLOYMENT.md §7); DNS cutover via Cloudflare; backup/restore and rollback drills executed (DEPLOYMENT.md §9–10); monitoring (Sentry/uptime) live.
**Exit criteria:** All Definition of Done checks (CLAUDE.md) pass for every shipped module; production health check green; rollback path verified before the domain cutover, not after.

---

## Cross-Phase Notes

- **Settings module** is not a standalone phase — it's built incrementally wherever a ⚠ pending business rule above gets confirmed (attendance threshold, grading weights, late-fee rules), since those are exactly the values `settings` (DATABASE.md §2.8) exists to hold.
- **Audit Logs** is not a standalone phase either — it's live from Phase 2 onward as the event-listener pattern (ARCHITECTURE.md §5) makes it a passive consumer of every other module's events, not a module with its own UI-heavy feature work beyond an admin-facing log viewer (folded into Phase 18's Reports work). Its first read-facing UI shipped early, as part of the Phase 2 Admin User Management extension's per-user audit timeline.
- **Naming note:** "Admin User Management" (system-user account CRUD/lifecycle/roles, tracked under the Phase 2 extension above), "Admin Student Management" (the student half of Phase 5 above, profile data), and "Admin Trainer Management" (the trainer half of Phase 5 above, profile data) are three different, separately-shipped modules that were each informally labeled "Phase 5"/"Phase 6"/"Phase 7" in different planning contexts outside this file. This roadmap's phase numbers are the authoritative reference: user-account management is Phase 2's extension; student profile management is Phase 5's student half; trainer profile management is Phase 5's trainer half — both halves are now implemented.
- Every phase's "blocking decision" items are consolidated in PROJECT-UNDERSTANDING-REPORT.md §10 — this roadmap does not introduce new open questions, it maps the existing ones to the point in the build where each one becomes a hard blocker versus a soft, deferrable one.
