# Daisy Minds LMS — Deployment

**Target infrastructure:** Hostinger VPS (Ubuntu) · Nginx · PM2 · MongoDB Atlas · Cloudflare · Let's Encrypt.

---

## 1. Environments

| Environment | Purpose | Branch | Infra |
|---|---|---|---|
| **Local** | Individual development | `feature/*` | Local Node, local/dev MongoDB Atlas project or local MongoDB |
| **Staging** | Pre-production validation, QA, stakeholder review | `develop` | Same VPS or a smaller separate VPS, staging Atlas cluster/DB, staging Cloudinary folder |
| **Production** | Live system | `main` | Production VPS, production Atlas cluster |

Staging and production **never share a database, Cloudinary account/folder scope, or payment-gateway live keys** — staging always uses the payment gateway's test/sandbox mode. This is non-negotiable given payments are involved.

## 2. Branching & Release Process

- `main` — always deployable, protected, production state.
- `develop` — integration branch, deploys to staging automatically on merge.
- `feature/<module>-<short-desc>` — one branch per feature/task, merged into `develop` via PR.
- Release: `develop` → `main` via PR once staging validation passes the module's Definition of Done (CLAUDE.md: lint, build, tests, responsive, accessible, secure, documented).
- Commit messages follow **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) — see CODING-STANDARDS.md §7.

## 3. CI/CD Pipeline (GitHub Actions)

No CI currently exists in the repo — this is a gap flagged in the understanding report and must be in place before Phase 3 (Admin Dashboard) per the recommendation there. Minimum pipeline, running on every PR and on merge to `develop`/`main`:

1. **Install** — cached `npm ci` for both `backend/` and `frontend/`.
2. **Lint** — ESLint (fails the build on any error, per CLAUDE.md "never disable ESLint").
3. **Type-check** — `tsc --noEmit` (fails on any `any`-related or type error, per "never use any").
4. **Test** — unit + integration test suites (backend), component tests (frontend).
5. **Build** — production build for both apps; a failed build blocks merge.
6. **Dependency audit** — `npm audit` (or GitHub Dependabot alerts) surfaced as a required check for high/critical severities.
7. **Deploy** (merge to `develop`/`main` only) — SSH/rsync or a GitHub Actions self-hosted runner on the VPS triggers the deploy script (§5).

This maps directly to CLAUDE.md's Definition of Done — the pipeline is the automated enforcement of "Lint passes / Build passes / Tests pass," not a manual checklist.

## 4. Server Topology

```
Cloudflare (DNS, proxy, edge WAF/DDoS)
   └── Nginx (Ubuntu VPS)
         ├── / (frontend)      → served as static build output (Vite dist/), gzip + long-cache headers on hashed assets
         ├── /api/v1/*         → reverse-proxied to the Express API (127.0.0.1:<port>)
         └── TLS termination   → Let's Encrypt (certbot, auto-renew)
Express API runs under PM2 in cluster mode (instances = CPU core count) for multi-core utilization on a single VPS
```

Nginx responsibilities (illustrative, not exhaustive): reverse proxy to the PM2-managed Node process, TLS termination, gzip compression, static asset caching headers, and forwarding `X-Forwarded-For`/`X-Forwarded-Proto` so the Express app sees the real client IP (required for accurate rate limiting, SECURITY.md §5).

## 5. Process Management (PM2)

- Cluster mode, one worker per CPU core — gives the API multi-process concurrency on a single VPS without additional infrastructure (ARCHITECTURE.md §12).
- Deploys use `pm2 reload` (not `restart`) for **zero-downtime** rolling restarts across cluster workers.
- PM2 startup script registered with systemd so the app survives a VPS reboot.
- PM2 log rotation enabled — logs are not left to grow unbounded on the VPS disk.

## 6. Environment Variables

- Every required variable is documented in `.env.example` (to be created alongside the first backend scaffold) with a placeholder, never a real value.
- Real `.env` files exist only on their target environment (local dev machine, staging VPS, production VPS) — never committed, never transmitted over chat/email; provisioned via secure copy during server setup.
- Config is loaded through a typed, **validated** config module (Zod schema) at boot — the app fails fast at startup if a required variable is missing or malformed, rather than failing unpredictably later at request time.

## 7. Database & Storage

- **MongoDB Atlas:** separate projects/clusters for staging and production (§1). Cluster tier sized against DATABASE.md's stated NFRs — sizing decision and cost approval are a pre-Phase-1-infra-setup task, not deferred to launch week.
- **Redis:** self-hosted on the VPS for V1 (co-located with the API process is acceptable at current scale) — revisit as a managed Redis if it becomes a reliability bottleneck.
- **Cloudinary:** separate folder/preset scoping for staging vs. production so test uploads never mix with production media.

## 8. Monitoring, Logging, Health Checks

- A `/api/v1/health` endpoint (unauthenticated, minimal — DB connectivity + process uptime) for uptime monitoring and load-balancer/PM2 health checks.
- PM2's built-in process monitoring (`pm2 monit`) for V1; structured JSON logging (via `pino`/`pino-http`, not `console.log`) from the Express app so logs are grep/aggregate-friendly.
- **Application error tracking (e.g., Sentry) and infrastructure monitoring (e.g., Grafana/Uptime Kuma) are not yet in the stack — recommended additions before production launch**, tracked as a Phase 20 pre-launch item in ROADMAP.md.

## 9. Backup & Rollback

- Database: MongoDB Atlas automated backups (DATABASE.md §6).
- Application: rollback is `git revert` + redeploy of the previous known-good commit via the same CI/CD pipeline — no manual hotfix-on-server patching, which would silently diverge the running code from source control.
- Deploys are tagged (`vX.Y.Z`) so any production state can be traced back to an exact commit.

## 10. Pre-Launch Checklist (feeds Phase 20)

- Load testing against the PRD's NFR targets (10,000+ students, 2,000+ concurrent) — not yet performed, no tooling chosen (⚠ recommend k6 or Artillery).
- Security testing pass (SECURITY.md, and see the note in ROADMAP.md about moving this earlier rather than treating it as a single late-stage phase).
- Confirmed backup/restore drill (an untested backup is not a backup).
- Confirmed rollback drill.
- DNS cutover and SSL verified on the production domain via Cloudflare.
