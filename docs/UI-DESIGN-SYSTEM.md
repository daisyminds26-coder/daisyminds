# Daisy Minds LMS — UI Design System

**Feel:** premium SaaS — clean, professional, modern, spacious, responsive. Explicitly **not**: Bootstrap-default, Material-default, generic admin-dashboard template, glassmorphism, heavy gradients, clutter.

---

## 1. Color Tokens

**⚠ Note on contrast:** the PRD specifies "Daisy Yellow" as primary and "Warm White" as background. Yellow-on-white text combinations routinely fail WCAG AA (4.5:1 for body text). The token values below are chosen to satisfy the PRD's palette *while* meeting WCAG AA — **yellow is never used as a text color**, only as a background/accent/fill, always paired with Dark Charcoal text on top of it.

| Token | Value | Usage |
|---|---|---|
| `color-primary` | `#F5B700` (Daisy Yellow) | Primary buttons, active states, key accents — background/fill only |
| `color-primary-dark` | `#C99200` | Hover/pressed state of primary elements |
| `color-background` | `#FFFCF5` (Warm White) | App background |
| `color-surface` | `#FFFFFF` | Cards, modals, elevated surfaces |
| `color-text-primary` | `#2A2622` (Dark Charcoal) | Body text, headings — on Background/Surface/Primary all pass AA |
| `color-text-secondary` | `#6B6459` | Secondary/muted text — verified ≥4.5:1 on Background |
| `color-border` | `#E8E1D3` | Dividers, input borders |
| `color-success` | `#2E7D32` | Confirmations, passed/active states |
| `color-warning` | `#B45309` | Due dates, pending states (darkened amber for AA compliance, not raw amber) |
| `color-error` | `#C62828` | Validation errors, failed/destructive states |
| `color-info` | `#1565C0` | Informational banners |

**Contrast rule (non-negotiable):** any new color pairing must be checked against WCAG AA (4.5:1 normal text, 3:1 large text/UI components) before use — this is a lint-checkable rule, not a design suggestion, and should be enforced in component review.

## 2. Typography

- **Typeface:** Inter (system-ui fallback stack) — pairs cleanly with shadcn/ui, avoids a "generic dashboard" look better than default sans-serif stacks when paired with generous spacing.
- **Scale** (rem, 16px base):

| Token | Size | Weight | Usage |
|---|---|---|---|
| `text-display` | 2.25rem / 36px | 700 | Page hero headings (rare — dashboards mostly don't need these) |
| `text-h1` | 1.875rem / 30px | 600 | Page titles |
| `text-h2` | 1.5rem / 24px | 600 | Section headings |
| `text-h3` | 1.25rem / 20px | 600 | Card/panel titles |
| `text-body` | 1rem / 16px | 400 | Default body text |
| `text-body-sm` | 0.875rem / 14px | 400 | Secondary text, table cells |
| `text-caption` | 0.75rem / 12px | 500 | Labels, badges, timestamps |

## 3. Spacing

4px base grid: `4, 8, 12, 16, 24, 32, 48, 64` (maps directly to Tailwind's default scale — no custom spacing scale needed, which keeps the design system and the utility framework in sync). "Spacious" per CLAUDE.md means defaulting to the larger end of this scale for section/card padding (24–32px), not the smaller end.

## 4. Radius & Elevation

- Radius: `6px` (inputs, buttons), `12px` (cards, modals) — soft but not pill-shaped/playful.
- Elevation: **shadows only, no gradients or glass blur.** Two levels: `shadow-sm` (resting card) and `shadow-md` (dropdown/popover/modal). Avoid stacking more than two elevation levels on screen at once — a flat, confident hierarchy reads as "premium SaaS" more than heavy depth does.

## 5. Layout & Breakpoints

Tailwind defaults, used as-is (no custom breakpoints): `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`, `2xl 1536px`. Every screen is designed mobile-first and validated at all five breakpoints per CLAUDE.md's Desktop/Tablet/Mobile requirement — this is a build gate (Definition of Done: "✓ Responsive"), not optional polish.

## 6. Core Components (shadcn/ui as base, themed to tokens above)

Button (primary/secondary/ghost/destructive, with loading state), Input/Select/Textarea (with error state wired to API-STANDARDS.md's `error.details[].field`), Card, Table (with empty/loading/error states — see §8), Modal/Dialog, Tabs, Badge (status indicators: Enrollllment status, payment status, attendance status — each status maps to one semantic color from §1, consistently across the app), Avatar, Toast (for async action feedback), Sidebar navigation (role-aware — renders only the modules the current role has permission for, not just visually hides restricted items).

## 7. Iconography & Motion

- Icons: `lucide-react` (shadcn's standard pairing) — consistent stroke width, no mixed icon sets.
- Motion: subtle and purposeful only — 150–200ms ease-out for hover/state transitions, no decorative animation. Respect `prefers-reduced-motion`.

## 7a. Small Distributions Without a Charting Library

No chart/visualization library is installed (checked before adding one, per CLAUDE.md's Developer Experience/KISS priorities — a dependency is not worth it for a handful of 2–5-bucket distributions). The Admin Dashboard's `DistributionCard` (ARCHITECTURE.md §18) is the reference pattern: a labeled horizontal bar per bucket, with the count and percentage always rendered as visible text next to the bar (never color- or length-only, §9 below) and an `aria-label` summarizing the same information on the bar itself. Reach for this pattern before a charting dependency for any future small categorical breakdown; the pre-existing `ChartPlaceholder` component remains reserved for genuine multi-series/time-series charts once Reports & Analytics (ROADMAP.md) is built.

## 7b. Drag-and-Drop Reordering

`@dnd-kit` (`core`/`sortable`/`utilities`) is the one drag-and-drop dependency in this app, introduced for the Curriculum Builder (ARCHITECTURE.md §20) after checking maintenance/accessibility/bundle-size first, per CLAUDE.md's Developer Experience priorities. Reach for it before any other drag library for a future reorderable list. The reference pattern it established:

- **Drag is never the only way to reorder.** Every draggable item also gets explicit **Move up**/**Move down** actions in its dropdown menu — real menu items, not a visual-only affordance — so keyboard and screen-reader users have a fully equivalent path.
- **Drag handles are their own focusable element** with a descriptive `aria-label` (e.g. "Move module 2: JavaScript"), never the whole row/card, so a screen reader announces what's being moved.
- **No optimistic reordering.** The list re-renders only after the server confirms the new order; a failed reorder leaves the UI exactly as it was (nothing to visually roll back) and surfaces the error as a toast.
- **Cross-container movement** (e.g. moving a lesson to a different module) is a keyboard-accessible dialog action, not a second drop target spanning multiple `SortableContext`s — simpler to build correctly and never worse than drag for a user who can't drag.
- **Reused, not reimplemented, for the Phase 9C lesson-resource manager** — same `SortableContext`+move-up/move-down+no-optimistic-update pattern, applied to a second, unrelated list type without inventing a second reordering approach.
- **Deliberately *not* reused for the Phase 10A weekly-timetable editor**, despite `@dnd-kit` already being a project dependency — a batch's weekly schedule is a set of add/remove slots with no meaningful ordering concept (task scope: add slot, remove slot, optional copy-to-another-day), so introducing drag reorder there would be styling a UI affordance for an operation that doesn't exist. Reach for `@dnd-kit` only when a feature genuinely needs reordering, not merely because the library is already installed.

## 7c. Rich Text Editing

**Tiptap** (`@tiptap/react`+`@tiptap/starter-kit`+`@tiptap/extension-placeholder`) is the one rich-text editor dependency in this app, introduced for the Phase 9C lesson-content editor after the same maintenance/accessibility/bundle-size check §7b's `@dnd-kit` choice went through — it replaced a Phase 1 stub (`RichTextField`) that had zero real consumers, so no migration was needed.

- **The toolbar only exposes formatting the backend's sanitizer allowlist actually keeps** (bold/italic/strikethrough, bulleted/numbered lists, code block, blockquote) — never a button that promises a formatting the server would silently strip on save (SECURITY.md §6).
- **Explicit save, not autosave**, for authored lesson content — a visible "Unsaved changes" / "All changes saved" indicator next to the Save button is the required state, and navigating away (or closing the tab) with unsaved changes is blocked with a confirmation, not silently discarded.
- Frontend sanitization is never implemented or relied upon — the editor's HTML output is sent as-is; the backend is the only sanitization boundary.

## 8. Required UI States

Every data-bearing view must explicitly design for four states, not just the "happy path": **loading** (skeleton, not a spinner-only blank screen, for list/table views), **empty** (with a clear next action, e.g., "No batches yet — Create a batch"), **error** (retry affordance, human message from the API envelope's `error.message`), **populated**. This is a review checklist item, not a suggestion — a screen that only designs the populated state is not done.

## 9. Accessibility

- Target: **WCAG 2.1 AA** (explicit level — the PRD names "WCAG compliant" without a level; AA is the standard enterprise bar and is what the color tokens above were verified against).
- Every interactive element has a visible focus state (not just `outline: none` removed without replacement).
- All forms have associated `<label>`s; icon-only buttons have `aria-label`.
- Color is never the only signal for status (e.g., a status Badge pairs color with text, not color alone) — supports color-blind users. Content-readiness/launch-readiness badges (Phase 9C) follow the same rule — the label text (`No content`, `Content ready`, `Coming soon`, etc.) always renders alongside the tone, never a bare colored dot.
- Full keyboard navigability for all admin/trainer workflows (data entry, table actions, modals with focus trap). Destructive actions on real content (replacing/removing a lesson video or document, deleting a resource) always route through a keyboard-operable confirmation dialog naming exactly what will be lost — never a bare button with no confirmation step.

## 10. Dark Mode

**Out of scope for V1.** Not requested in the PRD; adding it later is additive (token-based theming already isolates color values in §1, so a dark palette can be layered on without a rework) but should not be built speculatively per CLAUDE.md's KISS principle.

## 11. What "Avoid" Means in Practice

- No default Bootstrap/MUI component styling left unthemed — every shadcn primitive is restyled to the tokens above before use.
- No dashboard with a dozen equally-weighted stat cards and no visual hierarchy — group and prioritize.
- No gradient backgrounds, no frosted-glass panels, no drop-shadow-heavy cards.
- Generous whitespace over dense information packing — where a real density need exists (e.g., attendance grid, results table), use a dedicated dense-table style rather than shrinking the whole design system's spacing.
