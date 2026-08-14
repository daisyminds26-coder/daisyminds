# Daisy Minds LMS — Frontend

React 19 + TypeScript + Vite SPA. See [../CLAUDE.md](../CLAUDE.md), [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md), [../docs/SECURITY.md](../docs/SECURITY.md), and [../docs/UI-DESIGN-SYSTEM.md](../docs/UI-DESIGN-SYSTEM.md) before making changes.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (Radix) · React Router v7 · TanStack Query · React Hook Form · Zod · Axios · Zustand · Lucide React · Vitest + Testing Library + MSW

## Getting Started

```bash
nvm use          # Node version pinned in .nvmrc
cp .env.example .env   # optional in dev — api-client.ts falls back to http://localhost:3000/api/v1
npm install
npm run dev
```

The backend must be running (`cd ../backend && npm run dev`) with roles seeded (`npm run seed:roles` — see `../backend/README.md`) for login to work against real data.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run lint:fix` | ESLint with autofix |
| `npm run typecheck` | Type-check only, no build output |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check (CI) |
| `npm run test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with a coverage report |

## Folder Structure

```
src/
├── app/       # App.tsx (composition root — bootstrap + tab sync + router), providers.tsx, router.tsx, theme/
├── routes/    # route-object arrays per area (admin/trainer/student/public) + layout wrappers
├── pages/     # route-level page components (dashboards, auth, account, error/status pages)
├── features/
│   ├── auth/      # api/ stores/ schemas/ hooks/ components/ utils/ types/ — see "Authentication" below
│   ├── users/     # api/ hooks/ schemas/ components/ types/ — Admin User Management, see "Admin User Management" below
│   ├── students/  # api/ hooks/ schemas/ components/ utils/ types/ — Admin Student Management, see "Admin Student Management" below
│   ├── trainers/  # api/ hooks/ schemas/ components/ utils/ types/ — Admin Trainer Management, see "Admin Trainer Management" below
│   └── dashboard/ # api/ hooks/ schemas/ components/ types/ — Admin Dashboard, see "Admin Dashboard" below
├── shared/
│   ├── components/  # ui/ (shadcn primitives) + layout/ feedback/ data-display/ forms/ overlays/ containers/
│   ├── guards/       # RequireAuth, RequireGuest, RequireRole, RequirePermission (UI-only — see ARCHITECTURE.md §4.2)
│   ├── config/         # navigation model
│   ├── hooks/            # use-media-query
│   ├── stores/             # Zustand — UI state only, never server state
│   ├── types/               # Role, NavItem, SessionUser
│   └── lib/                  # api-client (auth interceptors), auth-session-store, multi-tab-sync, api-error, query-client, utils, nav, toast
└── test/      # Vitest setup, MSW server + handlers, shared render/query-client test utilities
```

See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) §4 for the full rationale, §4.1 for the Phase 3 shell/routing decisions, and §4.2 for the Phase 4 authentication architecture.

## Authentication

Implemented against the real Express backend (`../backend/src/routes/auth.routes.ts`) — no mock/fake auth in production code; MSW mocks exist only under `src/test/`.

- **State model:** `shared/lib/auth-session-store.ts` (Zustand, memory-only) holds `status: 'loading' | 'authenticated' | 'unauthenticated'` and the access token. The user *profile* (`role`, `permissions`, ...) lives separately in TanStack Query's `['auth','me']` cache (`features/auth/hooks/use-current-user.ts`) — the two are never duplicated. See ARCHITECTURE.md §4.2 for why the token store lives in `shared/lib` rather than `features/auth/stores`.
- **Token strategy:** access token in memory only (never `localStorage`/`sessionStorage`); refresh token is the backend's httpOnly/Secure/SameSite=Strict cookie, never read or written by the frontend directly.
- **Bootstrap:** `features/auth/hooks/use-auth-bootstrap.ts` calls `POST /auth/refresh` once on app start; `RequireAuth`/`RequireGuest` both show a loader until it resolves, so a valid session never flashes the login page and an invalid one never flashes protected content.
- **Refresh queue:** `shared/lib/api-client.ts`'s response interceptor refreshes on a `401` from any endpoint except the public auth endpoints themselves, deduplicates concurrent refreshes into one network call, retries the original request exactly once, and clears auth state (redirecting via `RequireAuth`'s own state-driven `<Navigate>` — no imperative router coupling in the client) if the refresh itself fails. `403` never triggers a refresh.
- **Route guards** (`shared/guards/`): `RequireAuth`, `RequireGuest`, `RequireRole`, `RequirePermission` — all UI-only (SECURITY.md §3); the backend's middleware is the real boundary.
- **Multi-tab sync:** `shared/lib/multi-tab-sync.ts` (`BroadcastChannel`, with a `storage`-event fallback) broadcasts logout/logout-all/session-invalidated events — never the token itself. `features/auth/hooks/use-auth-tab-sync.ts` applies another tab's event locally without re-broadcasting.
- **Environment:** `VITE_API_BASE_URL` (falls back to `http://localhost:3000/api/v1` if unset — see `vite-env.d.ts`), `VITE_APP_NAME`, `VITE_SUPPORT_EMAIL` (optional, shown on the suspended-account screen). No secrets — see `.env.example`.

### Manual testing checklist

With both servers running and roles seeded:

1. `POST /auth/login` with a fresh `PENDING_VERIFICATION` account → Login page shows the "verify your email" alert with a working resend action.
2. Lock an account (5 wrong passwords) → Login shows "temporarily locked" with a real retry-after time.
3. Log in successfully as each role → redirected to the correct dashboard (`SUPER_ADMIN`/`ADMIN` → `/admin`, `TRAINER` → `/trainer`, `STUDENT` → `/student`).
4. Visit a protected URL directly while logged out → redirected to `/login`; after logging in, land back on that URL (only if it belongs to your role's area).
5. Log in, then open a second tab and log out from the first — the second tab should redirect to `/login` within moments.
6. On `/{area}/profile`, change your password — other open sessions should be revoked (verify via the Sessions list), current one stays active.
7. Revoke a *different* session from the Sessions list, then revoke your *current* session — the latter should immediately log you out.
8. Leave a tab open past the access token's 15-minute expiry, then trigger any authenticated request — it should refresh transparently with no visible interruption.
9. Tab through the login form and submit with <kbd>Enter</kbd> only — no mouse needed.

## Admin User Management

`features/users/` (mirrors `features/auth/`'s shape) against `../backend/src/routes/user.routes.ts` and `role.routes.ts`. Entry point: `pages/admin/UsersPage.tsx`, reachable via the "User Management" nav item for `ADMIN`/`SUPER_ADMIN`. See ARCHITECTURE.md §14 and SECURITY.md §3 for the full design and the privilege-escalation guards it relies on from the backend.

- One `features/users/api/users.api.ts` is the only file that calls `/users`/`/roles`; every mutation invalidates the `['users','list']` query-key prefix so filtered/paginated views stay consistent without manual cache surgery.
- `shared/lib/api-client.ts`'s `apiGetPaginated` is the only helper that surfaces the response envelope's `meta` (page/limit/total/totalPages) — a Phase 4 gap (the interceptor silently discarded it) fixed while building this module's paginated table.
- CSV export (`use-export-users.ts`) requests `responseType: 'blob'`, bypassing the JSON-envelope path entirely, and triggers a client-side download via `URL.createObjectURL` + a synthetic `<a download>` click — see API-STANDARDS.md's "Deliberate exception — file downloads."

### Manual testing checklist

Logged in as `SUPER_ADMIN` (repeat the role-restricted rows as `ADMIN` where noted):

1. `/admin/users` loads the stat cards, table, and filter bar; pagination and column sort (email/status/createdAt/lastLoginAt) all update the URL-independent table state correctly.
2. Search by email (prefix match) and filter by status/role — results and stat cards update; clearing filters restores the full list.
3. Create a user via the drawer (role picker populated from `GET /roles`) — appears in the table; if "send verification email" was checked, status shows `PENDING_VERIFICATION`.
4. Edit a user's non-auth fields via the drawer; assign a different role via the role dialog — table and detail drawer both reflect the change.
5. Deactivate, then reactivate, a user — each requires the confirm dialog; status badge updates immediately.
6. Soft-delete a user, then restore it from the deleted-users filter.
7. Select multiple rows and run a bulk action (activate/deactivate/delete) — the bulk-action bar shows per-row success/failure, a failure on one row doesn't block the rest.
8. Export CSV — file downloads with the current filter applied, opens correctly in a spreadsheet app.
9. Open the user detail drawer for another admin — Sessions and Audit Timeline tabs load; as `ADMIN` (not `SUPER_ADMIN`) those two tabs should be hidden/forbidden.
10. **Security guards, as `ADMIN`:** attempt to deactivate/delete/role-change a `SUPER_ADMIN` account — blocked with a clear error. Attempt to assign the `SUPER_ADMIN` role to anyone — blocked.
11. **Security guards, as `SUPER_ADMIN`:** your own row has no deactivate/delete action available. Deactivating the last remaining `ACTIVE` `SUPER_ADMIN` (not yourself) is blocked with a clear error.
12. Force-logout a session from the Sessions panel — that user's next authenticated request fails and they're redirected to login.
13. Resend verification / trigger password reset from the row menu — succeeds without error (email delivery itself is out of scope for this checklist).
14. Try to reach `/admin` while logged in as a `STUDENT` — redirected away (route-level `RequireRole`, closed as part of this module's work).

## Admin Student Management

`features/students/` (mirrors `features/users/`'s shape) against `../backend/src/routes/student.routes.ts`. Entry point: `pages/admin/StudentsPage.tsx`, reachable via the "Students" nav item for `ADMIN`/`SUPER_ADMIN`. A student is a `users` record (`role: STUDENT`) plus a `students` profile document, not a separate account system — see ARCHITECTURE.md §15, DATABASE.md §3.2, SECURITY.md §3/§6 for the full design.

- The create flow (`StudentCreateWizard.tsx`) is a `Stepper`-driven multi-section form (Account → Contact → Emergency → Guardian → Academic → Admin → Review) sharing **one** `useForm` instance across every step — navigating back and forth never loses entered data, since steps are conditional rendering within a single form, not separate mounted forms. Edit (`StudentEditForm.tsx`) reuses the same section layout as one scrollable form, without the stepper chrome.
- `dateOfBirth`/`admissionDate` use plain `z.date()` and `yearOfCompletion` is kept a validated string end-to-end (converted at submit time) — deliberately **not** `z.coerce.date()`/`z.coerce.number()`. Coercion makes a Zod schema's input type diverge from its output type, which breaks `useForm<T>()`'s `Control<T>` inference that every shared `*Field` component in this app depends on. See ARCHITECTURE.md §15 if adding a date/number field to a future form.
- Profile-photo upload (`use-student-photo.ts`) uploads directly from the browser to Cloudinary using a backend-issued signature, then confirms via a backend round trip that independently re-verifies the asset with the Cloudinary Admin API — the backend never proxies image bytes and never trusts the browser's word that an upload succeeded. See SECURITY.md §6.
- CSV export follows the same `responseType: 'blob'` exception as the Users module (API-STANDARDS.md).

### Manual testing checklist

Logged in as `SUPER_ADMIN` (repeat the role-restricted rows as `ADMIN` where noted):

1. `/admin/students` loads the stat cards, table, and filter bar; search (name/student ID/email), filters (status/gender/source/profile-completion), sort, and pagination all work.
2. Click "Add Student" — the multi-step wizard opens; fill Account (email/password/name/DOB/gender) and click Next — required-field validation blocks advancing with empty fields.
3. Navigate Back to a previous step, then Next again — previously entered values are still there (no data loss across steps).
4. Fill Contact (phone, address) and Emergency (at least one contact is pre-populated and required — try removing it down to zero and confirm the step blocks submission). Guardian and Academic are optional — leave them empty and proceed. Fill Admin (source/tags/notes) and reach Review.
5. Submit — the student appears in the table with a generated Student ID (`DM-STU-{year}-{6 digits}`) and a `PARTIAL` or `INCOMPLETE` profile-completion badge (no photo yet, possibly no academic record).
6. Open the new student's detail drawer — Overview/Academic/Guardian tabs show the entered data; upload a profile photo (JPG/PNG/WEBP, under 5MB) and confirm it appears immediately and profile-completion percentage increases.
7. Edit the student (non-stepper form) — change a field, submit, confirm the table/drawer reflect it; leaving the page with unsaved changes should prompt a browser "leave site?" warning.
8. Deactivate, then reactivate, a student — confirm dialog required each time; status badge updates.
9. Delete (soft-delete) a student, then restore it from the deleted-students filter — confirm the student's own login would be blocked while deleted (deactivated user, not the profile record itself).
10. Select multiple rows and run a bulk action (activate/deactivate/delete/restore) — per-row success/failure is reported, one failure doesn't block the rest.
11. Export CSV with a filter applied — file downloads, respects the filter, and a student name containing a leading `=`/`+`/`-`/`@` is not treated as a spreadsheet formula when opened.
12. As `SUPER_ADMIN`, open a student's Sessions and Activity (audit) tabs — both load. As `ADMIN`, those tabs should not appear.
13. Resend invitation from the row menu for a `PENDING_VERIFICATION` student — succeeds; try it again for an already-`ACTIVE` student — blocked with a clear error.
14. Try to reach `/admin/students` while logged in as a `STUDENT` or `TRAINER` — redirected away (same `RequireRole` gate the Users module closed).

## Admin Trainer Management

`features/trainers/` (mirrors `features/students/`'s shape) against `../backend/src/routes/trainer.routes.ts`. Entry point: `pages/admin/TrainersPage.tsx`, reachable via the "Trainers" nav item for `ADMIN`/`SUPER_ADMIN`. A trainer is a `users` record (`role: TRAINER`) plus a `trainers` profile document, not a separate account system — see ARCHITECTURE.md §17, DATABASE.md §3.2, SECURITY.md §3/§6 for the full design.

- The create flow (`TrainerCreateWizard.tsx`) is a `Stepper`-driven 9-step form (Personal → Contact → Professional → Qualifications → Employment → Teaching → Availability → Emergency → Review) sharing **one** `useForm` instance across every step, same pattern as the students module. Edit (`TrainerEditForm.tsx`) reuses the same section layout as one scrollable form, without the stepper chrome.
- `AvailabilityEditor.tsx` is a generic, reusable weekly recurring-slot editor (day + start/end time + timezone + type) shared by both the create wizard and edit form — not a calendar UI. Overlap validation (same day, same type, overlapping time range) runs client-side via a Zod `superRefine`, mirroring the backend's identical check.
- Timezone validation uses `Intl.DateTimeFormat(undefined, {timeZone: value}).` construction, not `Intl.supportedValuesOf('timeZone').includes(...)` — the latter false-negatives on common identifiers like `Asia/Kolkata` due to ICU alias canonicalization. See ARCHITECTURE.md §17 if touching this again.
- Profile-photo upload (`use-trainer-photo.ts`) follows the identical signed-Cloudinary-upload-then-backend-reverify flow as the students module. Qualification/certification document upload is metadata-only this phase (no upload UI).
- CSV export follows the same `responseType: 'blob'` exception as the Users/Students modules (API-STANDARDS.md); the export excludes free-text notes and any document/photo URLs.

### Manual testing checklist

Logged in as `SUPER_ADMIN` (repeat the role-restricted rows as `ADMIN` where noted):

1. `/admin/trainers` loads the stat cards, table, and filter bar; search (name/trainer ID/email/expertise), filters (status/employment status/employment type/availability status), sort, and pagination all work.
2. Click "Add Trainer" — the multi-step wizard opens; fill Personal (email/password/name) and click Next — required-field validation blocks advancing with empty fields.
3. Navigate Back to a previous step, then Next again — previously entered values are still there (no data loss across steps).
4. On the Qualifications/Employment/Teaching steps, add a qualification and a certification, then reach the Availability step.
5. On Availability, add two slots for the same day/type with overlapping times — submitting the form shows a clear overlap error under the second slot. Fix the overlap (change the day or time) and confirm the error clears.
6. Remove an availability slot — the row disappears and the field count updates.
7. Fill Emergency (optional) and reach Review — confirm the summary reflects what was entered — and submit. The trainer appears in the table with a generated Trainer ID (`DM-TRN-{year}-{6 digits}`) and a `PARTIAL` or `INCOMPLETE` profile-completion badge (no photo yet).
8. Open the new trainer's detail drawer — Overview/Qualifications/Employment/Availability tabs show the entered data; upload a profile photo (JPG/PNG/WEBP, under 5MB) and confirm it appears immediately and profile-completion percentage increases.
9. Edit the trainer (flat form) — change a field, submit, confirm the table/drawer reflect it.
10. Deactivate, then reactivate, a trainer — confirm dialog required each time; status badge updates.
11. Delete (soft-delete) a trainer, then restore it from the deleted-trainers filter.
12. Select multiple rows and run a bulk action (activate/deactivate/delete/restore) — per-row success/failure is reported, one failure doesn't block the rest.
13. Export CSV with a filter applied — file downloads, respects the filter, and confirm no salary/compensation column or document URL is present.
14. As `SUPER_ADMIN`, open a trainer's Sessions and Activity (audit) tabs — both load, including `trainer.availability_changed`/`trainer.employment_status_changed` entries after an edit that changes those fields. As `ADMIN`, those tabs should not appear.
15. Resend invitation from the row menu for a `PENDING_VERIFICATION` trainer — succeeds; try it again for an already-`ACTIVE` trainer — blocked with a clear error.
16. Try to reach `/admin/trainers` while logged in as a `STUDENT` or `TRAINER` — redirected away (same `RequireRole` gate the Users/Students modules use).
17. Open the detail drawer's future-module tabs (Courses/Batches/Live Classes/Attendance/Assignments/Performance) — each shows a clear "available in a later phase" empty state, not a broken control.

## Admin Dashboard

`features/dashboard/` against `../backend/src/routes/dashboard.routes.ts`. Entry point: `pages/admin/AdminDashboardPage.tsx` — this **is** the `/admin` index route (replaces the Phase 3 mock stat-card/chart-placeholder shell). See ARCHITECTURE.md §18, SECURITY.md §3/§4/§5/§8 for the full design.

- One `useAdminDashboard` hook (`keepPreviousData` + `enabled` gate) drives the whole page — no other component calls `getAdminDashboard` directly. Switching the period selector cancels the now-stale in-flight request (`AbortSignal` passed through to `apiGet`) instead of racing it against the new one.
- `DistributionCard` is a small, custom, accessible bar-list — **no charting library is installed**, and this app doesn't add one for a handful of 2–5-bucket distributions (checked bundle-size/accessibility cost first, per CLAUDE.md's Developer Experience/KISS priorities). Every bar's count/percentage is rendered as visible text, and each bar carries an `aria-label` text alternative — see UI-DESIGN-SYSTEM.md §7a.
- `recentActivity` is `null` in the API response for an `ADMIN` and a populated array for a `SUPER_ADMIN` — the page conditionally renders `RecentActivityCard` based on the current user's role, matching the backend's permission-aware response shaping rather than requesting a forbidden sub-resource.
- Dashboard alerts (`AlertsPanel`) link to allowlisted internal routes only, built entirely server-side (`alert.actionRoute`) — never constructed from client state. `StudentsPage`/`TrainersPage`/`UsersPage` each read `status`/`profileCompletionStatus`/`action` from the URL once at mount (`shared/lib/query-params.ts`) so an alert like "5 incomplete student profiles" actually lands on a pre-filtered table, and `?action=create` opens that page's create wizard immediately — the only cross-module change this feature required.
- `range=CUSTOM` uses two single-date `Popover`+`Calendar` pickers (not a form — page-level filter state, validated client-side via `customRangeSchema` before firing a request); every other range is computed server-side from the browser's own IANA timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

### Manual testing checklist

Logged in as `SUPER_ADMIN` (repeat the role-restricted rows as `ADMIN` where noted):

1. `/admin` loads six primary stat cards (Active students/trainers/users, New students/trainers, Pending verification), a secondary-metrics row (including "Published courses," added once Course Management shipped), and three distribution cards — no layout shift once data arrives (skeletons match the final grid shape).
2. Change the period selector to each named range (Today/Last 7 days/Last 30 days/This month/This year) — the "New students"/"New trainers" card labels and values update; the "Updated Xs ago" indicator refreshes.
3. Select "Custom range," pick a start date after today's implicit default and an end date before it — a clear validation message appears and no request fires until corrected; pick a valid start/end pair — the dashboard loads for that range.
4. Click the refresh button — the icon spins briefly, the "Updated Xs ago" text resets to "just now," and the previous numbers stay visible the whole time (no blank flash).
5. Confirm "Recent student admissions" and "Recent trainer onboarding" each show up to 5 real records with a relative timestamp, newest first, and a working "View all" link to the respective management page.
6. Confirm "Operational alerts" shows at least one alert (e.g. pending-verification accounts from earlier testing); click its action link and confirm it lands on the target page with the matching filter already applied.
7. Click "Add student" / "Add trainer" under Quick Actions — each opens the respective page with its create wizard already open (not just the bare list).
8. As `SUPER_ADMIN`, confirm "Recent activity" is visible and shows real lifecycle events (e.g. `Student created`) with a human name, not a raw ID. Log in as `ADMIN` instead — confirm that section does not render at all.
9. Try to reach `/admin` while logged in as a `STUDENT` or `TRAINER` — redirected away (same `RequireRole` gate every other admin page uses).
10. Resize to a mobile viewport — stat cards stack to one column, no horizontal scroll appears anywhere on the page.
11. Tab through the period selector, refresh button, and every alert/quick-action link using only the keyboard — each has a visible focus state and activates with <kbd>Enter</kbd>/<kbd>Space</kbd>.

## Admin Course Management

`features/courses/` against `../backend/src/routes/course.routes.ts`. Entry point: `pages/admin/CoursesPage.tsx`, reachable via the "Courses" nav item for `ADMIN`/`SUPER_ADMIN`. Scope is course-level metadata and lifecycle only — no curriculum, lessons, video, batches, enrolment, or payments; a course is a single self-contained document, not a `users`-linked profile like students/trainers. See ARCHITECTURE.md §19, DATABASE.md §3.3, SECURITY.md §3/§4/§6/§8 for the full design.

- The create flow (`CourseCreateWizard.tsx`) is a `Stepper`-driven 9-step form sharing **one** `useForm` instance across every step, same pattern as the students/trainers modules. Edit (`CourseEditForm.tsx`) reuses the same field groups as one scrollable form.
- `course.schemas.ts` types `CreateCourseFormValues`/`UpdateCourseFormValues` via `z.input<typeof schema>`, not `z.infer`/`z.output` — the schema has ~13 `.default(...)`-bearing fields, and `z.infer` (which treats defaulted fields as required) breaks `zodResolver`'s generic type inference project-wide with unrelated-looking `Control<T>` errors. See the code comment in that file and ARCHITECTURE.md §19 if touching this pattern again in a future module with many defaulted fields.
- Pricing cross-field validation (paid-requires-price, discount-below-base, sale-end-after-start) is enforced **backend-only** — removed from the frontend schema after it contributed to the type-inference issue above. A violation surfaces as an API-error toast on submit, not an inline field error.
- `EligibleTrainersField.tsx` is a read-only, cross-feature reuse of `features/trainers/api/trainers.api.ts#listTrainers` — it does not duplicate trainer-lookup logic, and only lists active, non-deleted trainers. This is metadata (which trainers *could* teach this course), not a real batch/schedule assignment.
- Thumbnail/banner upload (`use-course-media.ts`) follows the identical signed-Cloudinary-upload-then-backend-reverify flow as the students/trainers photo upload, generalized into 4 hooks (`useUploadCourseThumbnail`/`useRemoveCourseThumbnail`/`useUploadCourseBanner`/`useRemoveCourseBanner`).
- The detail page's future-module tabs (curriculum, batches, enrolment, etc.) each show an honest "available in a later phase" empty state — never fabricated data, per this module's own hard requirement.
- CSV export follows the same `responseType: 'blob'` exception as the other admin modules; excludes `internalNotes` and any Cloudinary credentials.

### Manual testing checklist

Logged in as `SUPER_ADMIN` (repeat the role-restricted rows as `ADMIN` where noted):

1. `/admin/courses` loads the stat cards, table, and filter bar; search (title/course code/category/tags), filters (status/visibility/level/delivery mode), sort, and pagination all work.
2. Click "Add Course" — the multi-step wizard opens; fill Basic Info (title, category, level, delivery mode) and click Next — required-field validation blocks advancing with empty fields.
3. Navigate Back to a previous step, then Next again — previously entered values are still there (no data loss across steps).
4. On the Pricing step, set pricing type to `PAID` with no price and try to submit — a clear error appears. Set a valid base price and a discount price higher than the base price — a clear error appears; fix it and confirm the error clears.
5. On the Eligible Trainers step, confirm the trainer picker lists only active, non-deleted trainers — select one or two.
6. Reach Review, confirm the summary reflects what was entered, and submit. The course appears in the table with a generated course code (`DM-CRS-{year}-{6 digits}`) and `DRAFT` status.
7. Open the new course's detail page — confirm the future-module tabs (curriculum/batches/enrolment/etc.) each show a clear "available in a later phase" empty state, not a broken control or fake data.
8. Try to publish the course before adding a description/duration/learning outcomes/thumbnail — the readiness panel lists specific blockers and the publish action is blocked (422 from the backend, surfaced as a clear error).
9. Upload a thumbnail (JPG/PNG/WEBP, under 5MB), fill in the remaining readiness fields, and publish — the course now shows `PUBLISHED` status and a publish timestamp.
10. Unpublish the course — status returns to `DRAFT`. Archive it — status becomes `ARCHIVED`. Restore it — status returns to `DRAFT` (never straight back to `PUBLISHED`).
11. Soft-delete a course, then restore it from the deleted-courses filter — confirm restoring a soft-deleted course does not change its lifecycle `status`.
12. Select multiple rows and run a bulk action (publish/archive/restore/delete) — per-row success/failure is reported, one failure doesn't block the rest.
13. Export CSV with a filter applied — file downloads, respects the filter, and confirm no internal-notes column or Cloudinary credential is present.
14. Open a course's Activity (audit) tab — confirm entries appear after create/publish/media-upload actions.
15. Try to reach `/admin/courses` while logged in as a `STUDENT` or `TRAINER` — redirected away (same `RequireRole` gate every other admin page uses).
16. Resize to a mobile viewport — the wizard, table, and detail page all remain usable with no horizontal scroll.

## Admin Curriculum Builder

`features/courses/curriculum/` (nested under the existing courses feature — curriculum only ever exists in the context of one specific course) against `../backend/src/routes/curriculum.routes.ts`. Entry point: `pages/admin/CourseCurriculumPage.tsx`, route `/admin/courses/:courseId/curriculum`, reached via the course detail drawer's Curriculum tab ("Open Curriculum Builder"). See ARCHITECTURE.md §20, SECURITY.md §3/§4/§8 for the full design.

- A dedicated full page, not a drawer tab — the course detail drawer's Curriculum tab shows only a compact readiness summary and a link out. A drag-handle-and-action-menu-heavy builder needs real page width, matching the same reasoning that moved course/student/trainer *creation* out of side drawers earlier in this phase's build sequence.
- `@dnd-kit` (`core`/`sortable`/`utilities`) is the app's first drag-and-drop dependency — one `DndContext` at the page level reorders modules, and each module card owns its own `DndContext` for reordering that module's own lessons. Moving a lesson to a *different* module is a keyboard-accessible "Move to module…" dialog, not a cross-container drop target (UI-DESIGN-SYSTEM.md §7b). Every reorderable item also has explicit **Move up**/**Move down** menu actions as the guaranteed-accessible alternative to drag.
- No optimistic UI — every mutation invalidates and refetches the curriculum tree on success. A failed reorder/move/duplicate leaves the UI exactly as it was (nothing was ever speculatively changed) and surfaces the error as a toast; success is also announced via toast, which the app's `<Toaster />` already renders inside an `aria-live` region.
- `CurriculumReadinessPanel` deliberately says "Curriculum structure ready," never "course ready to launch" — this is structural readiness only (at least one module/lesson, no orphans, no prerequisite cycles), a separate concept from Phase 9A's course metadata readiness. Neither implies the other.
- `LessonFormDrawer` links to the dedicated content editor ("Edit content", once the lesson has been saved) — the Phase 9B "content added in a later phase" placeholder is gone now that Learning Content Management (below) is built. Every `LessonRow` also has its own "Edit content" action and a content-readiness badge, so a lesson's content status is visible without opening the drawer at all.
- `PrerequisiteLessonsField` lists every other lesson already loaded in the course's curriculum tree (no separate API call) — cycle/self-reference/cross-course validation is enforced backend-only; a violation surfaces as an API-error toast on submit.

### Manual testing checklist

Logged in as `SUPER_ADMIN` (repeat the role-restricted rows as `ADMIN` where noted):

1. Open a course's detail drawer, go to the Curriculum tab, and confirm it shows a readiness summary (not the full builder) with an "Open Curriculum Builder" link.
2. Click through to `/admin/courses/:courseId/curriculum` — confirm the course title/code appear in the page header and a "Back to courses" link works.
3. On a course with no curriculum yet, confirm the empty state ("Start building your curriculum by adding the first module.") appears with a working "Add module" action.
4. Add a module (title + description + estimated duration) — confirm it appears at the end of the list with `DRAFT` status.
5. Add two lessons to that module — confirm both appear in creation order, and the module card's lesson count/duration summary updates.
6. Edit a module and a lesson — confirm changes save and display immediately.
7. Drag a module to reorder it (mouse), then use the row action menu's "Move up"/"Move down" to reorder via keyboard only — confirm both methods produce the same result and persist after a page refresh.
8. Drag a lesson to reorder it within its module, then use "Move up"/"Move down" on a lesson — confirm both work.
9. Use a lesson's "Move to module…" action to move it into a different module at a specific position — confirm it appears there and the source module's remaining lessons compact (no gap).
10. Duplicate a module that has lessons — confirm the copy has "(Copy)" appended, is `DRAFT`, and its lessons (including any in-module prerequisite relationships) are duplicated too.
11. Duplicate a single lesson — confirm the copy is inserted immediately after the source.
12. Set a lesson's prerequisite to another lesson in the same course — confirm it saves; try setting a lesson as its own prerequisite or creating a circular dependency (A requires B, B requires A) — confirm both are rejected with a clear error.
13. Archive a module, confirm its status badge updates and its lessons remain visible; restore it back to Draft.
14. Delete a module that has lessons, confirm both the module and its lessons disappear from the tree; restore the module and confirm the lessons come back too.
15. Delete a single lesson, confirm the remaining lessons in that module compact (no gap in position); restore it and confirm it reappears at the end of the module.
16. Publish a module and a lesson, confirm their status badges update to Published; unpublish both back to Draft.
17. Confirm the readiness panel reflects reality: empty curriculum shows "Needs attention" with blockers listed; a curriculum with at least one module and lesson shows "Curriculum structure ready."
18. Collapse and expand individual modules, then use "Collapse all"/"Expand all" in the page header — confirm both work.
19. Try to reach `/admin/courses/:courseId/curriculum` while logged in as a `STUDENT` or `TRAINER` — redirected away (same `RequireRole` gate every other admin page uses).
20. Resize to a mobile viewport — confirm the builder remains usable (stacked cards, no horizontal overflow) and reordering is still possible via the action-menu Move up/down actions even where drag is impractical.

## Admin Learning Content Management

`features/courses/curriculum/content/` (nested under the existing curriculum feature — content only ever exists in the context of one specific lesson) against `../backend/src/routes/lesson-content.routes.ts`. Entry point: `pages/admin/LessonContentEditorPage.tsx`, route `/admin/courses/:courseId/curriculum/modules/:moduleId/lessons/:lessonId/content`, reached from a lesson row's "Edit content" action or from inside the lesson edit drawer. See ARCHITECTURE.md §21, SECURITY.md §3/§4/§6/§8 for the full design.

- Content editing is `lessonType`-discriminated — the page renders exactly one of `TextContentEditor`/`ExternalLinkEditor`/`VideoContentEditor`/`DocumentContentEditor` based on the lesson's own type, plus an honest "coming in a future phase" notice for `QUIZ`/`ASSIGNMENT`/`LIVE_CLASS` (no disabled fake form).
- **Rich text** (`shared/components/forms/rich-text-field.tsx`) is now a real Tiptap editor (previously an honest disabled-toolbar stub with zero consumers) — toolbar only exposes formatting the backend's sanitizer allowlist keeps. Save is explicit (a "Save" button, disabled until the form is actually dirty), never autosave; navigating away or closing the tab with unsaved changes is blocked by a confirmation dialog (`use-unsaved-changes-guard.ts`, requires the app's Data Router `useBlocker`).
- **Video/document uploads** (`VideoContentEditor`/`DocumentContentEditor`) never auto-upload on file selection — an explicit "Upload video"/"Upload document" button is always a separate step, with a live progress bar (`Progress`, driven by axios `onUploadProgress`). Replacing an existing asset always shows a confirmation dialog first, naming what will be removed. Preview never shows a raw Cloudinary URL — it fetches a fresh short-lived signed URL on demand.
- **The resource manager** (`ResourceManager`/`ResourceRow`/`AddResourceDialog`) reuses the Curriculum Builder's exact `@dnd-kit` drag-plus-keyboard-move-up/down pattern (UI-DESIGN-SYSTEM.md §7b) — drag is never the only way to reorder resources either. Capped at 20 resources per lesson (`MAX_RESOURCES_HINT`, matching the backend's `MAX_RESOURCES_PER_LESSON`).
- **Direct-to-Cloudinary upload** (`lib/upload-to-cloudinary.ts`) generalizes the Phase 9A `use-course-media.ts` helper (previously hardcoded to `image/upload` via plain `fetch`) to any `resourceType`/`type`, switched to `axios` for upload-progress support.
- Three distinct readiness panels now exist and are never conflated: `CurriculumReadinessPanel` (Phase 9B, structural), `ContentReadinessPanel` (this lesson's content), and `LaunchReadinessPanel` (course-wide, composing all three layers — shown on the Curriculum Builder page). Copy always says "Learning content ready"/"Launch readiness," never that the course can accept students.

### Manual testing checklist

Logged in as `SUPER_ADMIN` (repeat the role-restricted rows as `ADMIN` where noted):

1. From the Curriculum Builder, click a lesson's "Edit content" action — confirm the content editor page opens with the lesson title, type badge, structural-status badge, and content-readiness badge (starts "No content").
2. On a `TEXT` lesson, type into the rich-text editor and confirm the toolbar (bold/italic/strike/lists/code/blockquote) works; confirm "Save" stays disabled until you've actually typed something, then click Save — confirm "All changes saved" and the readiness badge updates to "Content ready".
3. Make an edit, then try to navigate back to the curriculum builder without saving — confirm a "Leave without saving?" confirmation appears; cancel it, save, then navigate away — no prompt this time.
4. On an `EXTERNAL_LINK` lesson, enter `javascript:alert(1)` as the URL and try to save — confirm a clear client-side validation error appears and no request is sent. Enter a valid `https://` URL — confirm it saves and the parsed domain is shown.
5. On a `VIDEO` lesson, select a video file — confirm nothing uploads yet until you click "Upload video"; confirm a progress bar appears during upload, and format/duration/size/resolution appear once verified.
6. Select a new video file to replace the existing one — confirm a "Replace the existing video?" confirmation appears before the new upload starts.
7. Click "Preview" on a ready video — confirm a signed video plays in a dialog (never a raw Cloudinary URL visible anywhere in the page).
8. Click "Remove" on the video — confirm a confirmation dialog appears, and after confirming, the lesson returns to "No content".
9. On a `DOCUMENT` lesson, upload a PDF — confirm the filename/format/size appear, and "Preview" opens a signed document link in a new tab.
10. On a `QUIZ`/`ASSIGNMENT`/`LIVE_CLASS` lesson, confirm the content area shows an honest "coming in a future phase" message and no upload/save controls of any kind.
11. In the resource manager, add a resource (any allowed file type) with a title — confirm it appears in the list with its type/format/size badges.
12. Reorder two resources by dragging, then reorder again using the row action menu's "Move up"/"Move down" — confirm both methods work and persist after a refresh.
13. Edit a resource's title/description/downloadable toggle — confirm it saves without re-uploading the file. Delete a resource — confirm a confirmation dialog appears first.
14. Return to the Curriculum Builder page — confirm the lesson row now shows an updated content-readiness badge, and a "Launch readiness" panel is visible showing all three readiness layers (course metadata / curriculum structure / learning content).
15. Try changing a lesson's type (in the lesson edit drawer) away from one that already has content — confirm the save is rejected with a clear message, distinct from a plain validation error.
16. Try to reach the content editor URL directly while logged in as a `STUDENT` or `TRAINER` — redirected away (same `RequireRole` gate every other admin page uses).
17. Resize to a mobile viewport — confirm the editor, upload zones, and resource manager remain usable with no horizontal overflow.

## Admin Batch Management

`features/batches/` against `../backend/src/routes/batch.routes.ts`. Entry points: `pages/admin/BatchesPage.tsx` (`/admin/batches`), `pages/admin/BatchCreatePage.tsx` (`/admin/batches/new`), `pages/admin/BatchDetailPage.tsx` (`/admin/batches/:batchId`), reachable via the "Batches" nav item for `ADMIN`/`SUPER_ADMIN`. A batch is a scheduled delivery *instance* of a course — "when and how," as distinct from a course's own "what." This module deliberately does not implement attendance, live classes, or anything downstream of scheduling — student enrolment, waitlisting, and batch transfer now live in the **Admin Enrolment Operations** module below (Phase 10B Part 2), with a lightweight Students tab surfaced here on the batch detail page. See ARCHITECTURE.md §22, DATABASE.md §3.3, SECURITY.md §3/§4/§8, API-STANDARDS.md for the full design.

- The create flow (`BatchCreateWizard.tsx`) is an 8-step `Stepper`-driven form (Course & Identity → Dates & Timezone → Trainers → Weekly Timetable → Delivery & Location → Capacity → Calendar Exceptions → Review), same one-`useForm`-instance-across-steps pattern as courses/students/trainers. It always creates a `DRAFT` batch — scheduling is a separate, explicit action taken afterward from the detail page, never automatic.
- `batch.schemas.ts` follows the exact same `z.input<typeof schema>` (never `z.infer`) rule ARCHITECTURE.md §19 documents for courses, and additionally carries **no cross-field `.superRefine()`/`.refine()` anywhere in the schema tree** — end-date-after-start-date, same-day slot overlap, minimum-below-maximum-capacity, and primary-not-also-assistant are all backend-only checks, surfaced as an API-error toast on submit rather than an inline field error, for the identical `zodResolver` generic-inference reason.
- `PrimaryTrainerField`/`AssistantTrainersField` are a read-only, cross-feature reuse of `features/trainers/api/trainers.api.ts#listTrainers` — the same pattern `EligibleTrainersField` established for courses. The backend is authoritative for trainer eligibility/availability; the frontend never filters or blocks a selection on its own judgment.
- `WeeklyScheduleEditor` deliberately does **not** use `@dnd-kit` even though it's already a project dependency (UI-DESIGN-SYSTEM.md §7b) — the editor only needs add/remove-slot and an optional copy-to-another-day, not reordering. Same-day overlap is flagged client-side as a visual warning only; the backend remains the actual validation boundary.
- Weekly-schedule times are plain `<input type="time">` fields (`TextField`'s `type="time"` variant) paired with the batch's own timezone — never converted to or displayed as UTC, matching how the backend stores them.
- `ReadinessPanel` and `ConflictsPanel` render exactly what the backend returns and never re-derive blockers/conflicts client-side — same "backend is the single source of truth" rule courses' own `ReadinessPanel` established. A `ConflictsPanel` entry with a `conflictingBatchId` links to that batch's own detail page.
- Lifecycle actions (Schedule/Return to Draft/Activate/Complete/Cancel/Archive/Restore) are explicit buttons on the detail page, gated to the batch's current status — never a generic editable status dropdown. Cancel/Archive/Delete are wrapped in a confirmation dialog naming the consequence; Schedule/Activate/Complete/Restore are direct-click with a success/error toast.
- The batch list and detail page's capacity display reads "{occupied}/{max} seats" — real, backend-computed seat occupancy (Phase 10B Part 2), not the earlier "Max {N}" placeholder. `occupiedSeats` is never client-editable; the only way to change it is through the Enrolment Operations module's own lifecycle actions.
- CSV export follows the same `responseType: 'blob'` exception as the other admin modules; excludes `internalNotes` and the full venue address.

### Manual testing checklist

Logged in as `SUPER_ADMIN` (repeat the role-restricted rows as `ADMIN` where noted):

1. `/admin/batches` loads the stat cards (total active/scheduled, upcoming, active, draft — never a student/enrolled/seat count), table, filter bar, and pagination; search (name/batch code), filters (status/delivery mode/temporal), and sort all work.
2. Click "Create Batch" — the 8-step wizard opens. On Step 1, search and select a course; confirm a `DRAFT`-status course is selectable but shows a visible warning that it must be published before this batch can be scheduled, and that `ARCHIVED`/deleted courses never appear in the search.
3. On Step 3 (Trainers), confirm the primary-trainer field only allows one selection and the assistant-trainers field allows several; try selecting the same trainer as both primary and an assistant — confirm this is rejected with a clear error (either inline or as an API-error toast on submit).
4. On Step 4 (Weekly Timetable), add two overlapping slots on the same day — confirm a visual overlap warning appears; add a slot with an end time before its start time — confirm this is rejected. Confirm the total-weekly-hours summary updates as slots are added/removed.
5. On Step 2, enter an invalid timezone string — confirm it's rejected; enter a valid IANA zone (e.g. `Asia/Kolkata`) — confirm it's accepted.
6. On Step 5, set delivery mode to `OFFLINE` — confirm the location fields switch to a full venue address (no meeting-provider field); set it to `ONLINE` — confirm only a meeting-provider placeholder + notes field appear (no real link/credential field exists anywhere); set it to `HYBRID` — confirm both sets of fields are available together.
7. On Step 6, set a minimum-students value higher than the maximum — confirm this is rejected (backend-surfaced error is acceptable).
8. On Step 7, add a calendar exception (date + type + title) — confirm it appears in a chronological list; try adding a second exception on the same date — confirm it's rejected.
9. Reach Review, confirm the summary reflects what was entered and notes the batch will be created as Draft, and submit. Confirm you land on the new batch's own detail page with a generated batch code (`DM-BAT-{year}-{6 digits}`) and `DRAFT` status.
10. On the batch detail page's Overview tab, confirm the Readiness panel lists specific blockers (e.g. "Assign a primary trainer.", "Offline batches require a venue.") for an incomplete batch.
11. Finish configuring the batch (dates, trainer, timetable spanning at least a week, and — if offline/hybrid — a complete venue address) until the Readiness panel shows "Ready to Schedule."
12. Assign a trainer whose declared availability doesn't cover one of the batch's weekly slots (or who is already `SCHEDULED`/`ACTIVE` on another overlapping batch) — confirm the Conflicts panel shows a clear message (e.g. "Trainer unavailable during Wednesday 18:00–20:00.") and, for a cross-batch conflict, a working link to the other batch.
13. Click "Schedule Batch" — confirm the status badge updates to `SCHEDULED` and the available actions change (e.g. "Return to Draft", "Activate", "Cancel" now appear; "Schedule Batch" no longer does).
14. Click "Activate" — status becomes `ACTIVE`. Click "Complete" — status becomes `COMPLETED`. Click "Archive" — status becomes `ARCHIVED`. Click "Restore" — status returns to `DRAFT` (never straight back to an operational status).
15. From a `DRAFT`/`SCHEDULED`/`ACTIVE` batch, click "Cancel" — confirm a confirmation dialog explains the consequence before the status changes to `CANCELLED`.
16. On the Schedule tab, edit the weekly timetable and save — confirm the whole timetable is replaced (this is a full-array replace, not a per-slot edit) and the change is reflected immediately.
17. On the Settings tab, confirm there is no input for `batchCode` or the course — both are shown as read-only text, never editable fields.
18. Use "Duplicate" on a `SCHEDULED` or `ACTIVE` batch — confirm the dialog asks for a new name (and optionally new dates), and the resulting batch has a new batch code, `DRAFT` status, and the original's trainers/timetable/capacity/location/tags copied — but not its calendar exceptions, internal notes, or audit history.
19. Select multiple rows on the list page and run a bulk action (archive/cancel/delete) — per-row success/failure is reported, one failure doesn't block the rest.
20. Export CSV with a filter applied — file downloads, respects the filter, and confirm no internal-notes column or full address is present.
21. Open a batch's Audit tab — confirm entries appear after create/trainer-assignment/schedule/other lifecycle actions.
22. Try to reach `/admin/batches` while logged in as a `STUDENT` or `TRAINER` — redirected away (same `RequireRole` gate every other admin page uses).
23. Resize to a mobile viewport — confirm the wizard, table, weekly-timetable editor (stacked one-slot-per-row layout), and detail page all remain usable with no horizontal scroll, and that every weekly-timetable action (add/remove/edit a slot) is reachable by keyboard alone.

### Phase 10C manual verification (Batch Operations & Admin Productivity)

Batch Detail's tabs are now Overview / Students / Schedule / Trainer / Operations / Audit (renamed from Trainers/Settings). Quick spot-check, logged in as `SUPER_ADMIN`:

- **Overview** — the compact summary shows real status/course/trainer/dates/capacity/timezone/timetable-slot-count fields only (no fabricated attendance/completion/revenue figures); the capacity widget shows "occupied / max Seats Occupied" with Available/Waitlist/Utilization stats and an accessible progress bar; the health checklist shows ✓/⚠/✕ items composed from existing readiness/conflict data, never a generic "success score."
- **Roster** (Students tab) — search and the status filter both narrow the table; a row's action menu only offers actions valid for that enrolment's current status (e.g. only `ACTIVE` rows offer Suspend/Complete); Suspend/Resume/Complete/Transfer/Drop all work and match `EnrollmentDetailPage`'s own behavior exactly (same mutations).
- **Waitlist** (same tab, below the roster) — Promote and Cancel both work; a promoted student disappears from the waitlist and the capacity numbers refresh.
- **Timetable** (Schedule tab) — the read-only summary shows each day with formatted times (e.g. "6:00 PM – 8:00 PM") and total weekly hours; the calendar view shows the batch's date range and marks any calendar-exception date as "No class."
- **Health** — confirm a batch missing a primary trainer/timetable shows those exact blockers and an overall "Blocked" badge; a fully configured, conflict-free batch shows "Ready."
- **Mobile** — resize to a mobile viewport and confirm the Overview cards stack, the roster becomes usable without horizontal scroll, and the tab list scrolls/wraps rather than overflowing.

## Admin Enrolment Operations

`features/enrollments/` against `../backend/src/routes/enrollment.routes.ts`. Entry points: `pages/admin/EnrollmentsPage.tsx` (`/admin/enrollments`), `pages/admin/EnrollmentCreatePage.tsx` (`/admin/enrollments/new`), `pages/admin/EnrollmentDetailPage.tsx` (`/admin/enrollments/:enrollmentId`), reachable via the "Enrolments" nav item for `ADMIN`/`SUPER_ADMIN`. An enrolment is a student's membership in one batch — the admin surface over Phase 10B Part 1's backend engine (capacity/waitlist, lifecycle, transfer, access entitlement), which this build treats as authoritative and does not redesign. This module deliberately does not implement the Student Learning Portal, self-service enrolment, the Learning Player, progress/attendance/assignments/quizzes, fees/payments, or certificates. See ARCHITECTURE.md §24, DATABASE.md §3.4, SECURITY.md §3/§4/§8 for the full design.

- The create flow (`CreateEnrollmentWizard.tsx`) is a 4-step `Stepper`-driven form (Student → Batch → Capacity → Review), same one-`useForm`-instance-across-steps pattern as every other admin wizard. The Capacity step shows live seat availability and previews the outcome ("a seat is available" vs. "batch full — student will be waitlisted"), but the server decides the actual result at submit time — the UI never assumes its own preview is authoritative, and the result screen distinguishes a Confirmed toast from a Waitlisted one.
- `StudentSelectorField`/`BatchSelectorField`/`StudentMultiSelectField` are read-only, cross-feature reuse of `features/students/api/students.api.ts#listStudents` and `features/batches/api/batches.api.ts#listBatches` — the same combobox template `PrimaryTrainerField`/`EligibleTrainersField` established. The backend remains authoritative on enrolment eligibility (duplicate/suspended-account/capacity); a non-`ACTIVE` student is shown with a visible status flag rather than hidden, so an admin understands why a submit might later be rejected.
- `AccessBadge` renders exactly the backend-derived `accessState` (`Access Active`/`Lifetime Access`/`Access Not Yet Active`/`Access Suspended`/`Access Ended`/`No Access`) and never re-derives entitlement from raw status/date fields client-side — same "backend is the single source of truth" rule `ReadinessPanel`/`ConflictsPanel` established for batches.
- Lifecycle actions on the detail page and the list's row-action menu are both computed from the enrolment's current status (never a generic status dropdown) — only the transitions valid from that status are ever offered, mirroring the backend's own `ALLOWED_TRANSITIONS` table without duplicating its logic. All consequential actions (Suspend/Complete/Drop/Cancel/Promote/Transfer) require a confirmation dialog naming the actual consequence.
- `TransferEnrollmentDialog` restricts its target-batch selector to the enrolment's own course (`BatchSelectorField courseId={enrollment.courseId}`) and excludes the current batch — the backend re-verifies the same-course rule regardless, so this is a UX guardrail, not the security boundary. A successful transfer shows lineage links ("Transferred to:"/"Transferred from:") on both the old (now `DROPPED`) and new enrolment.
- `BulkEnrollDialog` shows an *estimate* of confirmed vs. waitlisted counts before submit, clearly labeled as such — the backend decides the real, transaction-safe per-student result, and the result screen (succeeded/waitlisted/failed with per-student reasons) treats a partial failure as normal, never a top-level error.
- No business-error-code taxonomy was introduced — every mutation error is rendered via the existing `getSafeErrorMessage(error)` utility (same pattern every other feature uses), since Part 1's services only ever throw generic `CONFLICT`/`BAD_REQUEST`/`NOT_FOUND` codes with a human-readable message, not granular codes like `CAPACITY_FULL`.
- The Batch Detail "Students" tab and Student Detail "Enrolments" tab are both lazy-loaded (only query once their tab is actually opened) and intentionally lightweight — a capacity/waitlist summary and a capped recent-enrolments list linking to the full `/admin/enrollments` list, not a full roster/history browser.
- CSV export follows the same `responseType: 'blob'` exception as the other admin modules and respects whatever list filters are currently applied; the file is never reconstructed client-side.

### Manual testing checklist

Logged in as `SUPER_ADMIN` (repeat the role-restricted rows as `ADMIN` where noted):

1. `/admin/enrollments` loads the stat cards (Active/Confirmed/Waitlisted/Suspended), table, filter bar, and pagination; search (enrolment code/student name/email/batch/course) and the status/source/sort filters all work.
2. Click "Enrol Student" — the 4-step wizard opens. Select a student with an available-seat batch — the Capacity step shows "a seat is available," and submitting shows a Confirmed outcome; land on the new enrolment's detail page with a generated code (`DM-ENR-{year}-{6 digits}`) and `CONFIRMED` status.
3. Repeat against a batch that is full with waitlisting enabled — the Capacity step shows "batch full — student will be waitlisted," and submitting shows a Waitlisted outcome instead, distinctly labeled from the Confirmed case.
4. Attempt to enrol a student already actively enrolled in the same batch — confirm a clear "already enrolled" error is surfaced (not a raw error code), and no duplicate enrolment record is created.
5. On the detail page, click through the full status-appropriate lifecycle: Confirm (if `PENDING`)/Activate/Suspend/Resume/Complete/Drop/Cancel — confirm only the actions valid for the current status ever appear, and Suspend/Complete/Drop/Cancel each show a confirmation dialog naming the real consequence before applying.
6. From a `WAITLISTED` enrolment (list row menu or detail page), click "Promote from waitlist" — confirm it succeeds when a seat is free and shows a clear "No seat is currently available" message when it isn't; confirm the batch's capacity/waitlist numbers refresh afterward.
7. Suspend an `ACTIVE` enrolment — confirm the seat remains counted as occupied (capacity numbers don't change) and the Access badge switches to "Access Suspended"; Resume — confirm it returns to "Access Active."
8. Complete an `ACTIVE` enrolment — confirm its seat is released (the batch's available-seats count increases by one) and the Access badge reflects lifetime/ended access correctly depending on whether an access end date is set.
9. From a `CONFIRMED`/`ACTIVE`/`SUSPENDED` enrolment, click "Transfer" — confirm the target-batch selector only ever shows batches from the same course (never a cross-course batch, even if one exists); complete a transfer and confirm the original enrolment shows `DROPPED` with a "Transferred to:" link, and the new one shows "Transferred from:" — both links navigate correctly.
10. Note the source and target batches' capacity/waitlist figures before and after the transfer — confirm both refresh to their real, updated values.
11. Click "Bulk Enrol," pick a batch and several students (including more students than the batch has free seats, if waitlisting is enabled) — confirm the estimate shown before submit is clearly labeled as an estimate, and the result screen shows accurate succeeded/waitlisted/failed counts with a reason for each failure.
12. Select multiple rows on the list page and run a bulk Suspend/Resume/Cancel — confirm only `suspend`/`resume`/`cancel` are offered (no bulk complete/drop), a confirmation dialog appears, and a partial per-row failure (e.g. a `CONFIRMED` row can't be "resumed") doesn't block the rows that do succeed.
13. Export CSV with a filter applied — file downloads, respects the filter, and the filename matches `daisy-minds-enrollments-YYYY-MM-DD.csv`.
14. Open an enrolment's Audit tab — confirm entries appear only once the tab is opened (not pre-fetched with the rest of the page) and list human-readable actions (Enrolled/Activated/Suspended/etc.), not raw event metadata.
15. On a batch's detail page, open the "Students" tab — confirm it shows real seat/available/waitlisted counts, a capped list of currently enrolled students, a working "Add Student" action pre-scoped to that batch, and a "View all enrolments" link that lands on the enrolments list pre-filtered to that batch.
16. On a student's detail drawer, open the "Enrolments" tab — confirm it lazy-loads (no request fires until the tab is opened), shows the student's enrolment history with course/batch/status, and each row links to that enrolment's own detail page.
17. Reduce a batch's `maxStudents` below its current occupied-seat count from the batch Settings tab — confirm the save is rejected with a clear error, never silently accepted.
18. Try to reach `/admin/enrollments` while logged in as a `STUDENT` or `TRAINER` — redirected away (same `RequireRole` gate every other admin page uses).
19. Resize to a mobile viewport — confirm the list (card layout), wizard, dialogs, and detail page all remain usable with no horizontal scroll, and every dialog/wizard step is reachable and completable by keyboard alone.
20. Simulate a concurrent-capacity scenario (e.g. two browser tabs enrolling into the last seat of the same batch) — confirm the losing submission is handled gracefully (waitlisted or a clear capacity message), never a raw/confusing error, and the UI's copy treats it as expected behavior rather than implying a bug.

## Student Portal (Phase 11A)

`features/student-portal/` against a new self-scoped `../backend/src/routes/student-portal.routes.ts` (`/api/v1/student/*`, gated on `requireRole('STUDENT')` alone — `STUDENT` has no permission-catalog entries). Entry points under `pages/student/`: `StudentDashboardPage` (`/student`), `MyCoursesPage` (`/student/courses`), `StudentCourseOverviewPage` (`/student/courses/:courseId`), `StudentSchedulePage` (`/student/schedule`), `StudentResourcesPage` (`/student/resources`), `StudentProfilePage` (`/student/profile`) — plus `/student/settings` reusing the existing `AccountSecurityPage` unchanged, and `/student/notifications`/`/student/certificates` as honest `ComingSoonPage` placeholders (those modules don't exist yet). See ARCHITECTURE.md §25 for the full design. **Course progress and the actual lesson player shipped in Phase 11B, below** — the bullets here describe the foundation this phase built on.

- Rendered inside a new `StudentShell` (`shared/components/layout/student-shell.tsx`), not the shared `DashboardLayout` Admin/Trainer use — same underlying `Sidebar`/`Header`/`MobileNavDrawer`/`Footer` primitives, plus a new `StudentBottomNav` (Home/Courses/Schedule/Profile, fixed, mobile-only) for the "premium, mobile-first learner" feel the task spec called for.
- Every query hook (`useStudentDashboard`, `useStudentEnrollments`, `useStudentCourse`, `useStudentSchedule`, `useStudentResources`, `useStudentProfile`) reads only the authenticated student's own data — there is no `studentId` parameter to pass in anywhere in this feature, by construction.
- `CourseCard`/`StudentCourseOverviewPage` render the backend-derived `accessState` (`accessStateLabel`/`accessStateTone` in `utils/access-state.ts`) via the shared `StatusBadge` — same "never re-derive entitlement client-side" rule the Admin Enrolment module's `AccessBadge` already established.
- `StudentResourcesPage` never renders a raw Cloudinary URL — "Download"/"Open" triggers `useResourceDeliveryUrl()` on click, which calls the signed-delivery endpoint fresh each time (a 5-minute-expiry URL is never cached/reused).
- `StudentProfilePage`'s edit form is deliberately narrow — phone/alternate phone/address/one emergency contact only, matching exactly what `backend/src/validators/student-portal.validator.ts#updateOwnProfileSchema` accepts; `studentId`, enrollment, role, account status, and profile photo upload are read-only or out of scope this phase.

### Manual testing checklist

Logged in as `STUDENT` (the seeded `active@example.com` / `correct-horse-1` account, or any student created via Admin Student Management with an admin-created enrolment):

1. `/student` loads the dashboard — with an `ACTIVE` enrolment, "Continue Learning" shows the real course/batch and its link lands on the correct course overview; with no enrolment at all, an honest "You don't have an active course yet" empty state appears instead (no fabricated stat cards).
2. `/student/courses` lists every enrolment as a card (thumbnail/title/code/batch/access-state badge/level/mode/certificate indicator) — never a course the student isn't enrolled in.
3. Open a course from either page — `/student/courses/:courseId` shows the header (title, level, mode, batch, trainer) plus the published curriculum accordion when the enrolment is `ACTIVE`/`COMPLETED`-with-access.
4. From an Admin session, suspend that same student's enrolment; reload the course page as the student — confirm it still returns `200` with an "Your course access is currently paused" message, the curriculum section is gone, and no lesson/module data is present in the response (check Network tab, not just the UI).
5. Visit a course id the student was never enrolled in — confirm a clean 404-driven "Course not found" state, not a raw error or a leaked course title.
6. `/student/schedule` shows upcoming class occurrences (date/time/timezone/delivery mode) derived from the active batch's weekly timetable — confirm a date marked as a `calendarException` (holiday/no-class) in that batch's settings does not appear.
7. `/student/resources` lists resources grouped by course, only for courses with active access; click "Open"/"Download" — confirms a signed URL request fires and the file opens in a new tab; a resource attached to a draft/unpublished lesson never appears in the list even if the student is otherwise entitled.
8. `/student/profile` shows read-only identity fields (name, student ID, email, profile-completion bar) plus an editable contact-details form (phone/alternate phone/address/one emergency contact); save a change and confirm it persists on reload.
9. `/student/settings` reaches the existing Account Security page (change password, sessions, logout all devices) — same component Admin/Trainer already use, unmodified.
10. Try to reach `/admin/*` or `/trainer/*` while logged in as a `STUDENT` — redirected to `/unauthorized`, same `RequireRole` gate every other area uses; confirm the student sidebar never shows an Admin/Trainer nav item.
11. Resize to a mobile viewport — confirm the bottom nav (Home/Courses/Schedule/Profile) appears, all four routes are reachable from it, the full nav (incl. Resources/Settings) is still reachable via the header's hamburger drawer, and no page produces horizontal scroll.

## Learning Player (Phase 11B)

`features/learning-player/` against a new `../backend/src/routes/student-learning.routes.ts` (`/api/v1/student/courses/:courseId/{progress,lessons/:lessonId,lessons/:lessonId/media,lessons/:lessonId/progress,lessons/:lessonId/complete}`). Entry points: `StudentLearningRedirectPage` (`/student/courses/:courseId/learn` — resolves real resume-learning server-side, then `<Navigate>`s) and `StudentLearningPlayerPage` (`/student/courses/:courseId/learn/:lessonId`) — both mounted as **siblings of**, not children of, the `StudentShell` route tree (`app/router.tsx`), so the player renders its own full-page header/curriculum-sidebar without the portal's sidebar/header/bottom-nav on top of it. See ARCHITECTURE.md §26 for the full design.

- `LessonContentPane` dispatches by `lessonType` to `VideoLessonPlayer`/`TextLessonView`/`DocumentLessonView`/`ExternalLinkLessonView` — `QUIZ`/`ASSIGNMENT`/`LIVE_CLASS` render an honest "Available in a later phase" state, never a fake form.
- `VideoLessonPlayer` is a plain HTML5 `<video>` with native controls (no player-library dependency) — position reports on a ~12s throttle plus pause/seek/unmount, resumes from `lesson.progress.videoPositionSeconds` on load, and auto-completes server-side at 90% watched (the frontend never decides completion itself, only reports position).
- `TextLessonView` renders `lesson.textContent` via `LessonTextContent` — a direct render of server-sanitized HTML (Phase 9C's `sanitize-html`, at write time), styled with a compact hand-written set of Tailwind child-selectors rather than pulling in `@tailwindcss/typography` for one read-only view.
- `DocumentLessonView`/`ExternalLinkLessonView`/`LessonResourcesList` never fetch a signed URL until the student clicks Open/Download — `useLessonMediaUrl`/`useResourceDeliveryUrl` are mutations, not queries, and nothing is cached beyond the click.
- `PlayerCurriculumList` renders real per-lesson state — ✓ completed / ● in progress / ○ not started / 🔒 locked, each paired with visible text (`aria-label`), never color alone — and is reused unchanged by both the desktop sidebar and the mobile `Sheet` drawer.
- `CourseProgressBar` (`features/student-portal/components/`) is the one progress-bar component every view renders — the player header, `CourseCard`, `ContinueLearningCard`, and `StudentCourseOverviewPage` all show the same backend-computed `percentage`, never a client-side recalculation, always paired with real text ("5 of 12 required lessons completed").
- "Continue Learning"/"Start Learning" CTAs across the Dashboard, My Courses, and Course Overview all route to `/student/courses/:courseId/learn` (no lesson id) — the redirect page, not the CTA itself, decides which lesson to resume.

### Manual testing checklist

Logged in as `STUDENT`, with a course that has at least two published lessons where the second has the first as a prerequisite:

1. From the Dashboard or My Courses, click "Start Learning" — lands on the first published lesson; the header shows the course title, current lesson title, and a progress bar reading "0 of N required lessons completed."
2. Complete a `TEXT` lesson via "Mark as complete" — button switches to a disabled "Completed" state; reload the page and confirm it's still marked complete (not lost on refresh).
3. Open a `VIDEO` lesson — confirm the player loads a real signed URL (Network tab, not a raw Cloudinary `publicId`), play forward past ~90% of the duration, and confirm the lesson is marked `COMPLETED` without clicking anything.
4. Leave a video partway through, navigate away, then reopen the same lesson — confirm playback resumes near where you left off (not from `0:00`).
5. Open a `DOCUMENT` lesson — confirm no delivery URL is requested until you click "Open document," and it opens in a new tab.
6. Open an `EXTERNAL_LINK` lesson — confirm it's a plain outbound link (`target="_blank" rel="noopener noreferrer"`), never an embedded iframe.
7. Before completing the prerequisite, try to open the dependent lesson directly (via URL) — confirm it shows a locked state with the lock reason as visible text, and no lesson content/media is present in the API response (check Network tab).
8. Complete the prerequisite — confirm the dependent lesson unlocks (both in the curriculum sidebar and by opening it directly) without a page reload being required beyond normal navigation.
9. Use Previous/Next at the bottom of the lesson — confirm they follow module-then-lesson order and skip nothing; on the last lesson with everything required complete, confirm a "Course learning complete" state instead of a dead-end Next button.
10. Resize to a mobile viewport — confirm the curriculum sidebar is gone, a "Curriculum" button opens it in a bottom-accessible drawer, and Previous/Next are a sticky bar at the bottom of the screen that never overlaps lesson content.
11. From an Admin session, suspend the student's enrolment; reload a lesson the student was mid-way through — confirm the lesson shows a paused-access state, not the video/text content, and the media-delivery endpoint returns `403` if called directly.
12. As the student, edit the page URL to a lesson id from a course you're not enrolled in — confirm `404`, not a leaked lesson title or a raw error.
13. Check that the Dashboard/My Courses/Course Overview progress bars all agree with each other and with the player header for the same course (same percentage, same "N of M" count) — they're all reading the same backend value.

## Live Classes + Attendance (Phase 12)

Four feature folders against `../backend/src/routes/{live-class,attendance,student-live-class,trainer-live-class}.routes.ts`: `features/live-classes/` (admin `/live-classes/*`), `features/attendance/` (session-scoped roster/mark/finalize/reopen + the cross-session admin report, shared by admin and trainer), `features/student-live-classes/` (self-scoped `/student/live-classes/*` + `/student/attendance`), `features/trainer-live-classes/` (self-scoped `/trainer/live-classes/*`, reusing `AdminLiveClass`/`AttendanceRosterPanel` from the two admin feature folders rather than a parallel type/component set). See ARCHITECTURE.md §27 for the full backend design this UI sits on.

- `AttendanceRosterPanel` (`features/attendance/components/`) is the **one** roster + mark + finalize + reopen implementation, rendered by both the admin session-detail page (`canFinalize`) and the trainer self-scoped attendance page (`canFinalize={false}`) — same component, same mutation hooks, only a boolean prop and a `basePath` differ.
- `CreateLiveClassDialog`/`GenerateLiveClassesDialog` both require a known `batchId` — a live class is never created from a floating, batch-picker form; both are only opened from the Batch Detail page's "Live Classes" tab (`BatchLiveClassesTab`, replacing the former placeholder in `FutureModuleCards`).
- `features/live-classes/utils/zoned-datetime.ts#zonedWallTimeToUtc()` converts a `datetime-local` input's wall-clock value into the correct UTC instant *in the session's own timezone* (mirroring the backend's identical round-trip technique) — never the admin's browser timezone, which may differ from the batch's.
- `LiveClassCard` (`features/student-live-classes/components/`) is reused unchanged by both the Student Dashboard's "Upcoming Live Classes" section and the full `/student/live-classes` page — the "Join Class" button only renders enabled once the backend-computed `canJoin` flag is true; before that it shows "Join available 15 minutes before class," and a cancelled session shows a clear, non-interactive cancelled state rather than disappearing from the list.
- No client-side permission-hiding was added for admin lifecycle/create/generate actions — the `Can`/`usePermission` hooks exist in `features/auth/` but, matching every other admin page in this codebase, aren't used to hide buttons; the backend's `requirePermission`/ownership checks are the real, and only, enforcement boundary (SECURITY.md §3).

### Manual testing checklist

Logged in as `ADMIN`/`SUPER_ADMIN` on a batch with a weekly timetable and an assigned primary trainer:

1. From the batch's "Live Classes" tab, create a manual session — confirm it appears with a `DM-CLS-{year}-{seq}` code and `Draft` status.
2. From the same tab, "Generate from timetable" over a date range spanning the weekly slot at least twice — preview shows the occurrences; create them; running "Generate" again over the same range shows 0 created / N skipped (already existed).
3. Open the session detail page and walk it through Schedule → Start → Mark complete — confirm each button only appears for the correct current status, and a Cancel action is available until it's terminal.
4. Try creating a second session for the same trainer at an overlapping time — confirm a conflict error, then confirm providing an override reason lets it through.
5. On the Attendance tab, confirm every eligible student starts "Unmarked," mark one Present and one Absent, Save, then Finalize — confirm any still-unmarked student becomes Absent automatically, and further mark buttons disable.
6. Reopen attendance with a reason — confirm marking becomes possible again.
7. Log in as the assigned `TRAINER` — confirm `/trainer/live-classes` shows only sessions assigned to this trainer, Start/Mark complete work, and `/trainer/attendance` can mark the same session's roster but has no Finalize/Reopen button anywhere.
8. Log in as an enrolled `STUDENT` — confirm `/student/live-classes` shows the session with no Join button until the 15-minute window opens (or seed one already `LIVE`), that clicking Join opens the meeting URL in a new tab, and that a cancelled session shows a clear cancelled state instead of disappearing.
9. As the same student, confirm the Dashboard's "Upcoming Live Classes" section and `/student/schedule` never both show the same session — a real session always replaces its derived timetable slot for that date.
10. As the student, visit `/student/attendance` after an admin finalizes at least one session with this student marked — confirm the per-course percentage and recent-sessions list render.
11. Resize every page above to a mobile viewport — confirm the attendance roster never scrolls horizontally (row-card layout, not a wide table) and every mark button remains a comfortable touch target.

## Adding shadcn/ui Components

```bash
npx shadcn@latest add <component>
```

Components are written to `src/shared/components/ui` per `components.json`'s aliases. **Known CLI quirk in this environment:** the CLI has occasionally written files to a literal `./@/shared/components/ui/` directory instead of resolving the `@` alias to `./src/shared/...`. If that happens, move the generated files into `src/shared/components/ui/` and delete the stray `@/` directory — don't `git add` it.
