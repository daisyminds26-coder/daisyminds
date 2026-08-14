# Daisy Minds LMS — Project Understanding Report

**Purpose:** A pre-development analysis of the PRD (v1.0, Draft) and CLAUDE.md against the standards of a Senior Product Manager, Software Architect, Security Engineer, UI/UX Designer, Database Architect, and DevOps Engineer. No application code has been written. This document is the basis for alignment before implementation begins.

**Repo state at time of review:** `CLAUDE.md` and `docs/PRD.md` are the only populated documents. `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `API-STANDARDS.md`, `CODING-STANDARDS.md`, `DEPLOYMENT.md`, `ROADMAP.md`, `UI-DESIGN-SYSTEM.md`, and `CHANGELOG.md` all exist but are empty. `backend/` and `frontend/` are empty directories. Nothing has been implemented yet.

---

## 1. Product Understanding

Daisy Minds LMS is described as an enterprise-grade LMS intended to become **Daisy Minds' own primary education management platform** — but the PRD's Target Audience and Personas sections (colleges, coaching centers, corporate training providers, individual trainers) read like a platform meant to serve **many separate organizations**, not one institution's internal system. This tension is never resolved in the document, and it is the single most consequential open question in the PRD (see §10, Q1) — it changes the data model, RBAC design, billing model, and infrastructure sizing.

The PRD explicitly excludes **"Multi-Tenant White Label Platform"** from V1 scope, which suggests the intended answer is: **single organization (Daisy Minds), used internally**, with the broader "audience" language describing the *type* of market Daisy Minds itself operates in (it runs courses for colleges, corporates, etc. as its own customers/learners) rather than reselling the software. This is a reasonable interpretation but should be **confirmed, not assumed**, since it drives early architectural decisions (e.g., whether `organizationId` scoping is needed in the schema from day one, even if only one org exists initially).

The product is transactional and operational (course delivery, assessment, certification, payments, placement) rather than purely content-driven — it sits closer to a full **academic ERP + LMS hybrid** than a simple course-hosting tool.

---

## 2. User Roles

Four roles are defined: `SUPER_ADMIN`, `ADMIN`, `TRAINER`, `STUDENT`. The permission lists are directional, not exhaustive (e.g., "Reports," "Settings" are named as capabilities, not enumerated as specific permission strings).

**Gaps identified:**
- No **Parent/Guardian** role, despite the audience including "College Students" and potentially minors from coaching centers.
- No **Placement Officer / Corporate Recruiter** role, despite "Placement Management" being a full module — currently placement data has no external-facing consumer role.
- No **Finance-only** role separate from `ADMIN` — fee/payment operations are bundled into general admin permissions with no segregation of duties.
- No **read-only Auditor** role, despite "Audit Logs" being a listed module — currently only `SUPER_ADMIN` can presumably view them.
- No **support/helpdesk** role for handling student issues without full admin rights.
- No account lifecycle rules: is registration self-service (student signs up) or admin-provisioned only? Is there email/OTP verification, invitation-based onboarding for trainers, or approval workflows?
- No mention of whether roles are fixed (4 enum values) or whether a **custom role/permission** system is expected later (relevant given "future extensibility" is a stated goal).

---

## 3. Core Modules

The 27 modules group into 9 functional domains:

| Domain | Modules |
|---|---|
| Identity & Access | Authentication, User Management |
| Academic Core | Student Mgmt, Trainer Mgmt, Course Mgmt, Curriculum Builder, Batch Mgmt, Student Enrollllment |
| Learning Delivery | Learning Player, Progress Tracking, Live Classes |
| Assessment | Attendance, Assignments, Quizzes, Examinations, Results |
| Commerce | Fee Management, Payments |
| Credentialing | Certificates, Certificate Verification |
| Engagement/Ops | Notifications, Placement Management |
| Insights | Reports, Analytics, Audit Logs |
| Platform | Admin Dashboard, Settings |

Each module is named but **none has functional requirements defined**. The PRD states "Detailed functional requirements for each module are defined in subsequent chapters" (§13), but the document ends at the Roadmap (§16) — those chapters do not exist. This is the largest documentation gap in the project (see §7).

---

## 4. Development Phases

The roadmap defines 20 sequential phases from Project Setup through Production Deployment. Two sequencing concerns stand out:

- **Phase 19 — "Security Testing"** is placed second-to-last, after all 27 modules are built. Under CLAUDE.md's own stated security standards (JWT, RBAC, NoSQL injection protection, XSS protection, audit logging), security should be a **continuous, per-module gate** (as the Definition of Done implies: "✓ Secure" is listed per feature), not a single late-stage phase. As written, the roadmap risks treating security as a checkpoint rather than a practice.
- **Phase 16 — "Notifications"** comes after Attendance (11), Assignments (12), Quizzes/Exams (13), and Fees/Payments (14) — but notifications are a cross-cutting dependency for nearly all of those (Enrollllment confirmations, fee due reminders, assignment deadlines, live class alerts). Building it last means earlier phases either stub it out or get retrofitted.
- No phase has an estimated duration, resource allocation, or exit criteria beyond its name. There's no stated MVP cut-line — it's unclear whether "V1" means all 20 phases must ship together or whether an earlier subset is launchable.

---

## 5. Dependencies Between Modules

```
Authentication ──► everything (hard dependency for all modules)
User Management ──► Student Mgmt, Trainer Mgmt
Course Mgmt ──► Curriculum Builder ──► Batch Mgmt ──► Student Enrollllment
Batch Mgmt ──► Attendance, Live Classes
Student Enrollllment ──► Learning Player, Progress Tracking
Student Enrollllment ──► Assignments, Quizzes, Examinations ──► Results ──► Certificates
Fee Management ──► Payments ──(gates?)──► Student Enrollllment  [relationship undefined, see §8]
Results / Certificates ──► Placement Management (eligibility undefined, see §8)
Certificates ──► Certificate Verification (public-facing, security-sensitive)
Notifications ◄── consumed by nearly every module above (cross-cutting, but built last per roadmap)
Reports, Analytics, Audit Logs ◄── downstream read consumers of all transactional modules
```

The biggest structural risk here: **Fee Management/Payments and Student Enrollllment have an undefined relationship.** If Enrollllment is meant to be payment-gated (typical for a commercial LMS), Payments should be built *before* or *alongside* Enrollllment (Phase 7), not four phases later (Phase 14). As sequenced, early Enrollllment work may need to be reworked once payment gating rules are defined.

---

## 6. Risks

### 6.1 Architecture Risks
- **Monolith vs. modular boundaries undefined.** CLAUDE.md mandates "Modular Architecture" and "Feature-based Architecture" but the infra (single Hostinger VPS, PM2) implies a single-process NestJS monolith. With 27 modules in one codebase/database, internal coupling is a real risk unless module boundaries (and how they communicate — direct service calls vs. an internal event bus) are decided up front.
- **No live-class media technology is named.** "Live Classes" is a full module, but the tech stack lists no WebRTC/SFU provider (Agora, Twilio, LiveKit, Zoom SDK, Jitsi). Video conferencing at scale cannot be built on NestJS + MongoDB alone — this is a build-vs-buy decision with major cost and security implications that's currently unaddressed.
- **Video streaming infrastructure for the Learning Player is unspecified.** Cloudinary handles video *storage/transformation*, but adaptive-bitrate streaming at the stated concurrency (2,000+ concurrent users) needs verification against Cloudinary's plan limits — this hasn't been sized.
- **No CI/CD pipeline defined.** GitHub is listed only as source control; there's no mention of GitHub Actions (or equivalent) enforcing the lint/test/build gates that CLAUDE.md's own Definition of Done requires.
- **No environment strategy** (dev/staging/prod) or backup/DR policy (RTO/RPO) is defined despite using MongoDB Atlas, which supports both.

### 6.2 Scalability Concerns
- Single Hostinger VPS + PM2 implies **vertical scaling only** — no load balancer or multi-instance strategy is mentioned, which conflicts with the NFR target of 2,000+ concurrent users.
- **Live class concurrency is the highest-risk NFR.** Real-time video at scale genuinely needs a dedicated media server/SFU service; a general-purpose VPS running the API cannot also serve as a conferencing backend.
- MongoDB Atlas tier, sharding, and replica-set requirements for 10,000+ students / 1,000+ courses are not specified.
- No mention of Redis HA/clustering, or a CDN strategy for frontend static assets (Cloudflare is listed for DNS only — whether it's also used as CDN/WAF/proxy is unclear).
- No load-testing or capacity-planning step exists anywhere in the 20-phase roadmap despite specific numeric NFR targets.

### 6.3 Security Concerns
CLAUDE.md's security standards list (JWT, refresh tokens, RBAC, hashing, Helmet, NoSQL injection protection, XSS protection, signed Cloudinary uploads, audit logging) is a strong baseline, but several concrete gaps exist:
- **No MFA/2FA**, especially concerning for `SUPER_ADMIN`/`ADMIN` accounts with financial and system-config access.
- **No password policy specifics** (complexity, rotation, breach-list checking) or session management details (token TTL, refresh rotation, concurrent-session/device limits).
- **No content protection for paid video** (DRM, watermarking, screen-recording deterrence). For a commercial course platform, unprotected video is a piracy risk to the business model.
- **No data-privacy/compliance framework named.** Given the India-based audience and the likelihood of minors among "College Students"/coaching-center learners, **India's DPDP Act 2023** (and possibly GDPR if serving international corporate clients) should be an explicit compliance target — currently absent.
- **No payment gateway named**, so PCI-DSS scope is undefined. A hosted-checkout gateway (Razorpay/PayU/Cashfree) should be assumed to avoid handling card data directly, but this isn't stated.
- **No malware/virus scanning** mentioned for assignment/document uploads.
- **Certificate Verification is a public, unauthenticated endpoint by nature** — no mention of anti-enumeration controls (rate limiting, CAPTCHA) to prevent certificate-ID scraping/fraud probing.
- No mention of dependency/vulnerability scanning (SCA), SAST/DAST, or secrets management approach (env vars vs. a vault) in the pipeline.

### 6.4 UI/UX Concerns
- **Contrast risk in the stated palette.** "Daisy Yellow" primary on "Warm White" background is a combination that frequently fails WCAG AA contrast ratios for text/interactive elements — this needs an actual contrast audit before component work begins, since CLAUDE.md also mandates WCAG compliance.
- WCAG compliance is stated as a goal but **no conformance level (A/AA/AAA) is specified**.
- **No localization/i18n strategy** despite an India-focused audience where regional-language support (Hindi, etc.) is common for coaching centers.
- No wireframes, mockups, or user flows exist yet — `docs/UI-DESIGN-SYSTEM.md` is empty.
- No defined UX for notification channels (email/SMS/push/in-app — none of these are named as required channels), or for live-class features (recording, chat, screen share, polls).
- No standard for loading/empty/error states across the app.

### 6.5 Performance Concerns
- The API response target (<300ms) has **no percentile defined** (p50/p95/p99) and no distinction between simple reads, writes, and heavy report/export operations — as stated it's unmeasurable.
- No indexing plan exists yet (expected, since no schema exists) — but CLAUDE.md's "Proper indexes" standard needs a concrete plan before Course/Curriculum (Phase 4) begins.
- No cache invalidation strategy for Redis (what's cached, TTLs, invalidation triggers).
- Heavy operations (certificate PDF generation, report exports, video processing callbacks) have no defined background-job pattern despite BullMQ being in the stack.
- Reports/Analytics over 10,000+ students risks impacting OLTP performance if run against the primary database directly — no mention of read replicas or a separate aggregation/reporting path.
- No frontend performance budget (bundle size, Core Web Vitals targets) despite "premium SaaS" UX being a stated goal.

---

## 7. Missing Documentation

- `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `API-STANDARDS.md`, `CODING-STANDARDS.md`, `DEPLOYMENT.md`, `ROADMAP.md`, `UI-DESIGN-SYSTEM.md`, `CHANGELOG.md` — all exist as empty files referenced by the project structure but contain nothing.
- **Per-module functional requirements** — the PRD references these but they were never written (PRD ends before them).
- No data dictionary or ER diagram.
- No OpenAPI/Swagger contract (Swagger is in the stack but no spec exists yet, understandably).
- No wireframes/mockups.
- No `.env.example` or environment/config documentation.
- No test plan / QA strategy document, despite CLAUDE.md mandating unit/integration/permission/API tests per module.
- No third-party integration documentation (payment gateway, SMS/email provider, video conferencing provider — none are even named yet).
- No developer onboarding/setup guide (expected, since `backend/` and `frontend/` are still empty scaffolds).

---

## 8. Missing Business Rules

Concrete "what happens when…" questions with no defined answer in the PRD:

- **Enrollllment vs. Payment:** Can a student Enrollll before paying? Are installment/partial payments supported? Is access auto-revoked on non-payment?
- **Batch capacity:** Is there a max students-per-batch limit? Is there a waitlist mechanism?
- **Attendance:** Is there a minimum attendance % required to sit exams or receive a certificate?
- **Assignments:** What's the late-submission policy? Are resubmissions allowed? Is plagiarism checking required?
- **Quizzes/Exams:** Are retakes allowed? Is proctoring required? Is there server-side time-limit enforcement? Negative marking?
- **Results:** What's the grading scale? Pass/fail threshold? Is there a grade-appeal/moderation workflow?
- **Certificates:** Auto-issued on completion, or admin-approved? Can a certificate be revoked (e.g., fraud)? Do certifications expire?
- **Fee Management:** Refund policy? Late-fee penalties? Discounts/scholarships? Is GST-compliant invoicing required (mandatory for Indian B2B/B2C transactions)?
- **Placement:** How are students matched to employers? Is there an external employer-facing role/portal? What consent governs sharing student data with employers?
- **Trainer assignment:** How are trainers assigned to batches/courses — is multi-trainer-per-course supported? Is trainer compensation tracked in-system?
- **Course withdrawal:** Can a student drop a course mid-way? What's the cancellation/refund policy?
- **Content ownership:** If a trainer leaves the platform, who owns their uploaded lesson content?
- **Certificate Verification exposure:** Since this is a public page, exactly what fields are shown (name, course, date, score)? Student data-privacy needs to be balanced against verifiability.

---

## 9. Recommendations

- **Product:** Get explicit sign-off on the single-org vs. multi-org question (§10 Q1) before any schema work — retrofitting tenant scoping later is expensive. Define an explicit MVP module subset with a target launch date; a 27-module simultaneous build with no cut-line is a high-risk plan.
- **Architecture:** Build as a modular monolith in NestJS with clearly bounded module folders and an internal event mechanism (e.g., NestJS `EventEmitter` or CQRS) so modules like Notifications, Audit Logs, and Analytics can subscribe to domain events instead of being directly called everywhere — this avoids the coupling risk flagged in §6.1 while staying deployable on a single VPS initially.
- **DevOps:** Stand up CI (GitHub Actions) enforcing lint/build/test before this reaches Phase 3 — CLAUDE.md's Definition of Done implies this is already required per-feature, so the earlier it exists, the fewer retrofits later. Define dev/staging/prod environments and an Atlas backup/retention policy before real data exists.
- **Security:** Resolve the live-class and payment-gateway build-vs-buy decisions early — they carry the largest unaddressed security surface. Decide DPDP Act compliance scope explicitly given the India-based, potentially-minor audience, before Student Management (Phase 5) starts collecting PII.
- **Database:** Produce an ER diagram and indexing plan before Course & Curriculum work (Phase 4) begins, and decide the Atlas cluster tier based on realistic sizing against the stated NFRs (10,000+ students, 2,000+ concurrent).
- **UI/UX:** Run a WCAG contrast audit on the Daisy Yellow / Warm White palette immediately — this is cheap to fix now and expensive to fix after components are built. Populate `docs/UI-DESIGN-SYSTEM.md` with actual tokens (spacing, typography scale, component states) before frontend work starts.

---

## 10. Questions to Clarify Before Development

1. Is this system for Daisy Minds' own internal use only, or will it be licensed/resold to other institutes? ("Multi-Tenant White Label" is explicitly out of scope, but the Target Audience/Personas sections describe a multi-organization market — these two statements are in tension.)
2. What live-class technology is approved — build on WebRTC, or buy (Agora/Twilio/LiveKit/Zoom SDK)? This isn't in the current tech stack at all.
3. Which payment gateway(s) will be integrated (Razorpay, PayU, Cashfree, Stripe)? Are installment/EMI fee plans required?
4. Does the platform need to support minors, and if so, what parental-consent/guardian-role and data-protection controls are required under India's DPDP Act?
5. What is the actual MVP — all 27 modules, or a smaller launch set? Is there a target launch date driving the 20-phase roadmap?
6. Does course video content need DRM/watermarking/download-protection?
7. Is multi-language (Hindi/regional language) support required for V1?
8. What SMS/email provider will back the Notifications module?
9. Do certificates need to meet any accreditation/compliance format (e.g., NSDC, government-recognized certification bodies)?
10. Is the 4-role RBAC model final, or is a custom role/permission system needed (e.g., branch-level admin, finance-only admin, placement officer)?
11. Does Fee Management require GST-compliant invoicing?
12. What team size/composition will execute the 20-phase roadmap, and are there phase-level deadlines?
13. Is this greenfield, or is there existing student/course data to migrate?
14. What does "2,000+ concurrent users" mean precisely — logged-in idle sessions, or active video-streaming sessions? This changes infrastructure sizing by an order of magnitude.
15. Should the Certificate Verification page be fully public, and if so, what anti-abuse controls (rate limiting, CAPTCHA) are expected, and what student fields are safe to expose?

---

**Status:** This report identifies the gaps that exist prior to writing any code. No implementation should begin until the questions in §10 — particularly Q1 (tenancy model), Q2 (live-class technology), and Q4 (minors/compliance) — are answered, since each materially changes the data model and architecture.
