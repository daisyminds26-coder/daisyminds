# Daisy Minds LMS — Coding Standards

Concrete rules implementing CLAUDE.md's architecture principles (SOLID, DRY, KISS, Clean Architecture, Separation of Concerns) and coding rules (no `any`, no disabled linting, no placeholders).

---

## 1. TypeScript

- **Strict mode on** (`strict: true` in `tsconfig.json`) in both `backend/` and `frontend/` — never relaxed for convenience.
- **`any` is never used.** Where a type is genuinely unknown (e.g., a third-party webhook payload), use `unknown` and narrow it explicitly — this is the one acceptable escape hatch, and it still forces a runtime check before use.
- Explicit return types on all exported functions/methods (not on trivial private one-liners where inference is unambiguous) — this makes a function's contract reviewable without reading its body.
- No `// @ts-ignore` / `// @ts-expect-error` without a comment explaining *why* the suppression is correct, and these are reviewed as a red flag in PR review, not a routine tool.
- No disabling ESLint rules inline (`// eslint-disable-next-line`) without the same justification requirement — and never disabling a rule project-wide to silence a specific violation.

## 2. Backend (Express.js) Conventions

- **Controllers are thin:** read the already-validated `req` (validation happened in middleware before the controller runs), call a service method, send the response — no business logic, no direct Mongoose calls. A controller is a plain exported `async` function, not a class — there's no DI framework requiring a class here.
- **Services own business logic.** A service method should read as the business rule, not as plumbing. Services are typically classes (instantiated once per module and exported as a configured singleton) so they can hold injected dependencies (their repository, other services) as constructor-assigned fields — but a service with no state can just as validly be a plain function module.
- **Repositories own data access** where a module's query patterns are non-trivial enough to warrant the separation (per CLAUDE.md: "Repository Pattern where needed" — not mandated for every trivial CRUD module; a service calling its Mongoose model directly for a simple `findById` is acceptable, but any module with more than incidental query complexity gets a repository layer).
- **Zod schemas** are the only accepted input shape for a route — a controller's request type is always `z.infer<typeof someSchema>`, never `any` or an untyped `req.body` access. Validation happens in middleware (`validate(schema)`, API-STANDARDS.md §5), never inline in the controller.
- **One module per bounded domain** (ARCHITECTURE.md §3) — a module never reaches into another module's schema/model directly; it depends on the other module's exported service (via its `index.ts` barrel), or reacts via a domain event.
- **No DI container:** each module's `index.ts` wires its own dependencies explicitly — `new StudentRepository()` → `new StudentService(repository)` → `new StudentController(service)` → attach routes to a `Router` and export it. This is the one piece of boilerplate Express doesn't give you for free; keep it in exactly one file per module so it stays easy to find.
- File naming: `kebab-case.type.ts` (`student-profile.service.ts`, `student-profile.validation.ts`, `student-profile.router.ts`, `student.schema.ts`). Class naming: `PascalCase` matching the file's role (`StudentProfileService`, `StudentProfileRepository`).
- No fake/placeholder implementations: an endpoint that isn't finished is not merged returning hardcoded data — it isn't built yet, and isn't listed as done (per CLAUDE.md: "never create placeholder APIs," "never create fake implementations").

## 3. Frontend (React) Conventions

- Functional components with hooks only — no class components.
- **Server state** (anything from the API) lives exclusively in TanStack Query; **client/UI state** (session, sidebar open/closed, form draft state) lives in Zustand or local component state — never duplicated between the two.
- Forms use React Hook Form + Zod resolver; the Zod schema is the single source of validation truth on the frontend, mirroring the backend's own Zod schema for that endpoint (not code-shared across the repo boundary in V1, but kept intentionally in sync — a mismatch here is a review-time check).
- Feature folders (ARCHITECTURE.md §4) are self-contained: a feature's components, hooks, and API calls live together; only genuinely cross-feature UI primitives live in `shared/`.
- No prop-drilling more than 2 levels — reach for context/Zustand instead once a third level is needed.
- File naming: `PascalCase.tsx` for components, `useCamelCase.ts` for hooks, `camelCase.ts` for utilities.

## 4. Error Handling

- Backend: domain/business errors `throw` a typed `ApiError` (`utils/api-error.ts` — a base class with static factory methods like `ApiError.notFound()`, `ApiError.forbidden()`, `ApiError.validation()`, plus room for domain-specific subclasses like `DuplicateEnrollmentError`) — caught once, globally, by the final Express error-handling middleware that produces the API-STANDARDS.md error envelope. No controller/service catches an error just to swallow it or `console.log` and continue; Express 5's router forwards a rejected promise from an `async` handler to that middleware automatically, so no manual try/catch-and-forward boilerplate is needed per route (an explicit `asyncHandler` wrapper is still provided in `utils/` for readability/consistency and defense-in-depth).
- Frontend: TanStack Query's error state drives UI error display (UI-DESIGN-SYSTEM.md §8) — no silent `.catch(() => {})`.
- Never ignore a caught error without an explicit, commented reason (per CLAUDE.md: "never ignore errors").

## 5. Comments

- Default to no comments. Code should be self-explanatory through naming.
- A comment is justified only when it explains a **non-obvious why**: a workaround for a specific external-system quirk, a business rule that isn't derivable from the code alone (e.g., "attendance below 75% blocks exam eligibility per settings.attendanceThreshold" next to the check, if the *reason* for the threshold isn't self-evident from a config read), or a deliberately non-standard approach.
- No comments describing *what* the code does, no comments referencing a ticket/PR number, no commented-out dead code left in the codebase.

## 6. Testing

- Every module ships with unit tests (services — business logic), integration tests (controller + service + in-memory/test DB), permission tests (role/ownership guards actually deny what they should), and API tests (request/response contract) — per CLAUDE.md, "no module is complete until tests pass."
- Test files: `*.spec.ts` colocated with the file under test (backend), `*.test.tsx` colocated with components (frontend).
- Edge cases are explicitly covered, not just the happy path — especially around the business rules still marked ⚠ pending in other docs; once those rules are confirmed, their edge cases (e.g., "enrollment at exact batch capacity," "payment webhook received twice") are mandatory test cases, not optional ones.

## 7. Git

- Conventional Commits: `feat(students): add guardian contact field`, `fix(payments): handle duplicate webhook delivery`, `docs: update API standards`.
- Branch naming: `feature/<module>-<short-desc>`, `fix/<module>-<short-desc>` (see DEPLOYMENT.md §2).
- No direct commits to `main` or `develop` — PR review required, CI must pass (DEPLOYMENT.md §3) before merge.

## 8. Code Review Checklist (applied to every PR)

- [ ] No `any`, no disabled lint/TS rules without justification.
- [ ] Controller stays thin; business logic is in the service.
- [ ] Zod schema validates all input; no unvalidated field reaches the database.
- [ ] Permission/ownership check present for any endpoint touching another user's data.
- [ ] Tests added/updated and passing (unit, integration, permission as applicable).
- [ ] No hardcoded secrets, IDs, or environment-specific values.
- [ ] No placeholder/fake implementation merged as if complete.
- [ ] Docs updated if the change affects API contract, schema, or architecture (per CLAUDE.md: "never leave undocumented architecture changes").
