# Shortlist — CLAUDE.md

## What This Is

Personal job search tool: aggregates listings, AI-scores them against user criteria,
provides a resume tailoring workflow, and tracks the application pipeline. Portfolio
project by John Moorman, will become multi-user SaaS.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Database | Neon (PostgreSQL) |
| ORM | Prisma |
| Auth | Clerk |
| AI | OpenRouter API (multiple models — see AI section) |
| Scraping | Direct HTTP for Greenhouse, Lever, Ashby; USAJobs API; Adzuna API; Arbeitnow API |
| State | Zustand (client), React 19 `useOptimistic` (optimistic updates) |
| Virtualization | @tanstack/react-virtual |
| Scheduling | Vercel Cron |
| Theme | next-themes |
| PDF export | @react-pdf/renderer |
| Markdown editor | @uiw/react-md-editor |
| HTML → Markdown | turndown |
| Validation | Zod |
| Webhooks | svix (signature verification) |
| React Compiler | babel-plugin-react-compiler (enabled) |
| Date formatting | date-fns |
| Testing | Playwright (E2E), Vitest + React Testing Library (unit) |
| CI/CD | GitHub Actions (typecheck, lint, unit tests, Playwright) |
| Deployment | Vercel |

---

## Project Structure

```
src/
  app/
    (auth)/               # Clerk sign-in / sign-up pages
    (dashboard)/
      dashboard/          # Job feed — default view
      jobs/[id]/          # Job detail + match analysis
      tailor/[jobId]/     # Resume tailor — JD vs resume, streaming, editor, export
      pipeline/           # Application tracker (table + Kanban board views)
      settings/           # Profile settings, usage, feedback, model config, account
      actions-sync.ts     # Shared server actions across dashboard routes
      layout.tsx          # Dashboard shell — AppNav, max-width wrapper
    api/
      scrape/             # POST — pool-first scrape + profile matching pipeline
      analyze/            # POST — AI scoring for unanalyzed jobs
      tailor/             # POST — streams tailored resume
      tailor/save/        # POST — persists tailored resume draft
      jobs/extract/       # POST — AI extraction from pasted job text
      jobs/import/        # POST — custom job import into pool
      check-onboarding/   # GET — checks onboarding state (called by middleware)
      dev/seed/           # POST — dev-only seed route (not production)
    onboarding/           # Onboarding wizard for new users
    page.tsx              # Marketing / landing page
  components/
    dashboard/            # FeedToolbar, ProfileSwitcher
    jobs/                 # JobCard, JobFeed, ScoreBadge, JobDetailActions, JobNotesInput,
                          #   JobDescription, AnalyzeButton, ReanalyzeButton, ImportJobModal
    tailor/               # TailorPanel, GeneratePane, JobDescriptionPane,
                          #   ResumePDFDocument, PDFPreview, AutoSaveIndicator, MobileTabBar
    pipeline/             # PipelineTable, ApplicationDrawer, StatusSelect,
                          #   FollowUpBanner, PipelineStats, PipelineSortBar, ResumePDFModal,
                          #   shared (ScorePill, TERMINAL_STATUSES, STATUS_LABELS, getDefaultFields)
      kanban/             # KanbanBoard, KanbanColumn, KanbanCard, CardNotes, ViewToggle
    landing/              # LandingNav, AuthAwareCTA, HeroDemoPreview, FeatureRow
    onboarding/           # OnboardingWizard
    settings/             # SettingsClient, UsageSection, FeedbackForm, DeleteAccountSection,
                          #   AdvancedModelSettings
    layout/               # AppNav, NavFeedbackPopover
    providers/            # ThemeProvider, DashboardDataProvider, DashboardPrefetcher
    ui/                   # BrandMark, ThemeToggle, UsageWheel
  lib/
    prisma.ts             # Prisma client singleton
    openrouter.ts         # OpenRouter client (server-only — imports env vars)
    models.ts             # Model constants + getModels() helper (client-safe)
    ai-analysis.ts        # parseAiAnalysisResponse() — validates AI scoring output
    match.ts              # jobMatchesProfile() — in-process pool filtering (settings/onboarding)
    match-sql.ts          # findMatchingPoolIds() — SQL-based pool matching (scrape route)
    normalize.ts          # Source raw data → JobPool schema (all scrapers)
    feed.ts               # groupJobsByDate() — date bucketing for feed display
    jobs.ts               # buildWhereClause(), buildOrderBy() — feed query helpers
    get-active-profile.ts # Resolves active profile for current user
    rate-limit.ts         # In-memory sliding window rate limiter
    validations.ts        # Zod schemas for all API request bodies
    store.ts              # Zustand store (dashboard state)
    store-filters.ts      # Filter slice
    store-selectors.ts    # Derived selectors
    scrapers/
      greenhouse.ts       # Direct scraper for boards-api.greenhouse.io
      lever.ts            # Direct scraper for api.lever.co
      ashby.ts            # Direct scraper for api.ashbyhq.com
      usajobs.ts          # USAJobs federal jobs API scraper
      adzuna.ts           # Adzuna multi-country job search API scraper
      arbeitnow.ts        # Arbeitnow EU jobs public API scraper
  config/
    app.ts                # APP_CONFIG — app name lives here ONLY
    companies.ts          # Company lists + search configs for all scrapers
  types/
    index.ts              # Shared TypeScript types derived from Prisma
  env.ts                  # Environment variable validation (@t3-oss/env-nextjs)
  instrumentation.ts      # Next.js instrumentation hook
  middleware.ts           # Clerk auth + public route exemptions
prisma/
  schema.prisma           # Source of truth for DB schema
  seed.ts                 # Realistic mock data seed for development
tests/
  unit/                   # Vitest unit tests (components, helpers)
  *.spec.ts               # Playwright E2E tests
.github/
  workflows/ci.yml        # CI: typecheck → lint → unit → Playwright
```

---

## Database — Critical Rules

**`Job` is a junction table.** All content (title, company, description, location) lives
on `JobPool`. Always read content via `job.jobPool.*`. Include `jobPool: true` in Prisma
includes. `Job` only stores profile-specific data: AI scores, `feedStatus`, `viewedAt`,
`userNotes`, and the `Application` relation.

**Multi-tenancy:** Every query touching `Job`, `Application`, or `TailoredResume` must
be scoped to `profileId`. Every API route must verify the requested `profileId` belongs
to the authenticated Clerk user. Never trust a client-supplied `profileId` without this.

**Never discard raw scraper output.** Store verbatim in `JobPool.rawData: Json`. If
normalization logic changes, re-process from `rawData` rather than re-scraping.

**⚠ Dev and prod share the same Neon database.** Separation is planned. Never run
destructive migrations (reset, drop) without checking which environment you're targeting.

Schema relationships:
```
JobPool (global — no user association)
  └── Job[] (junction — one per profile that matched this listing)

User (Clerk ID)
  └── Profile (one-to-many: "Frontend Berlin", "Automation Remote", etc.)
        ├── Job[] → Application → TailoredResume[]
        └── ScrapeRun[]

User → Usage (token consumption tracking)
User → Feedback[]
DeletedUserUsage (orphaned — preserves hashed email + usage after account deletion)
```

---

## Authentication

```ts
import { auth } from "@clerk/nextjs/server";
const { userId } = await auth();
if (!userId) return new Response("Unauthorized", { status: 401 });
```

Clerk webhook at `/api/webhooks/clerk` to create `User` records is **⚠ not yet
implemented — critical for production.** Install `svix` for webhook signature
verification when this is built.

Middleware protects all `/dashboard` and `/api` routes. New users with no completed
profile are redirected to `/onboarding`. Onboarding state is tracked via a cookie
(`shortlist-onboarded`) — not a DB query on every request. On new device/cookie clear,
middleware calls `/api/check-onboarding` which queries Prisma (Edge middleware can't
use Prisma directly).

---

## App Name

Lives only in `src/config/app.ts` as `APP_CONFIG.name`. Never hardcode `"Shortlist"`
anywhere else in the codebase.

---

## AI — OpenRouter

All AI calls go through OpenRouter (`src/lib/openrouter.ts`) using the `openai` npm
package pointed at `https://openrouter.ai/api/v1`. Three specialized models:

| Task | Model | Constant (in `src/lib/models.ts`) |
|---|---|---|
| Resume tailoring | `qwen/qwen3.5-397b-a17b` | `TAILOR_MODEL` |
| Job match scoring | `anthropic/claude-haiku-4.5` | `ANALYZE_MODEL` |
| Job text extraction | `anthropic/claude-haiku-4.5` | `EXTRACT_MODEL` |

Model constants live in `src/lib/models.ts` (client-safe). The OpenRouter client lives
in `src/lib/openrouter.ts` (server-only — re-exports from models.ts). Client components
must import from `@/lib/models`, never `@/lib/openrouter`.

Users can override models per-profile via Advanced Settings. Use `getModels(profile)` from
`@/lib/models` to resolve overrides with fallback to defaults. **⚠ API routes not yet
wired to use `getModels()` — they still use hardcoded constants.**

Before every AI call: check `Usage.currentMonthInputTokens < Usage.monthlyLimitInputTokens`.
After every call: increment token counts.

---

## Scraping — Pool-First Architecture

**Layer 1 (global pool):** Scrape sources → write to `JobPool`. Deduplicated at
`@@unique([source, externalId])` via `createMany({ skipDuplicates: true })`.

**Layer 2 (profile matching):** The scrape route uses `findMatchingPoolIds()` from
`match-sql.ts` to match entirely in SQL — only matched IDs are returned from the DB.
Settings/onboarding use the in-process `jobMatchesProfile()` from `match.ts` (loads
newest 2000 pool entries). Same pool entry can appear in multiple profiles with
different scores.

Pass `?skipPool=1` to skip layer 1 and match against existing pool.

**Active scrapers** (6 sources, all run in parallel):

| Source | Auth | Config |
|---|---|---|
| Greenhouse | None | `GREENHOUSE_COMPANIES` in companies.ts |
| Ashby | None | `ASHBY_COMPANIES` in companies.ts |
| Lever | None | `LEVER_COMPANIES` in companies.ts |
| USAJobs | `USAJOBS_API_KEY` + `USAJOBS_EMAIL` | `USAJOBS_SEARCHES` in companies.ts |
| Adzuna | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | `ADZUNA_SEARCHES` in companies.ts |
| Arbeitnow | None (public API) | Always runs, no config needed |

USAJobs and Adzuna only run when their API credentials are set. Arbeitnow always runs.

**Matching logic** (`src/lib/match.ts`, short-circuit order):
1. Hard exclude — `excludedKeyword` in title → reject
2. Location filter — must match `targetLocations` or be remote-friendly
3. Role token match — tokenize `targetRole`, strip stopwords, match against title
4. Skill fallback — any `requiredSkill` in title → match
5. No criteria → everything passes

Cap: `MAX_CANDIDATES_PER_RUN = 30` per profile per run.

---

## Component Conventions

- **React Compiler is enabled** — no `useMemo`, `useCallback`, or `React.memo`. The
  compiler handles all memoization. If a component is opted out (console warning), it
  violates Rules of Hooks — fix the violation.
- Server Components by default. `"use client"` only for interactivity. Never on layouts
  or pages — extract client islands.
- All data fetching in Server Components or API routes. No client-side fetch waterfalls.
- Optimistic updates with `useOptimistic` (React 19) for Kanban status changes and feed
  actions — update UI immediately, sync to server in background.

---

## Visual Design

Light mode first, dark mode equally polished. All colours as CSS custom properties with
`:root` (light) and `.dark` (dark) values. Never hardcode a colour in a component.

Score badges: pair the number with a human label — "Strong match" (90+), "Good match"
(75–89), "Weak match" (<75). Non-technical users should never need to interpret a raw score.

No jargon. "Scrape" → "find jobs". "AI analysis" → "match score". "Master resume" → "your
base resume". Empty states must be helpful. Error messages must suggest a next step.

---

## Key Technical Rules

**Next.js 15 — async params/cookies/headers (CRITICAL):**
```ts
// ✅ correct
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
const cookieStore = await cookies();
const headersList = await headers();
```
`params`, `cookies()`, and `headers()` are all Promises. Synchronous access silently
breaks. Affects every dynamic route and middleware.

**Tailwind v4 CSS variables (CRITICAL):**
Use `bg-[var(--varname)]`, not `bg-[--varname]`. The shorthand only works for variables
registered in `@theme {}`. Design tokens in `:root`/`.dark` need explicit `var()`.

**Imports:** Always `@/` alias — never deep relative paths. Import `prisma` from
`@/lib/prisma` — never `new PrismaClient()` directly. Import env from `@/env.ts` —
never `process.env` directly. Validate all env vars at startup with `@t3-oss/env-nextjs`.

**Database:** Always `prisma migrate dev` — never `prisma db push`.

**Zod schemas** in `@/lib/validations.ts` — never inline in route files.

**Pagination:** Cursor-based on the job feed — never offset (`skip`/`take`). Page size 25.

**Dates:** `date-fns` everywhere — never `toLocaleDateString()`.

**SSR:** `@uiw/react-md-editor` and `@react-pdf/renderer` must be loaded with
`dynamic(..., { ssr: false })`. Never render in Server Components.

**Error resilience:** `fetchDashboardData` returns empty fallback on error instead of
crashing the dashboard. Server actions should degrade gracefully.

---

## Git — Branch Naming

`type/kebab-description` — e.g., `feature/clerk-webhooks`, `fix/feed-filter`, `refactor/ui-overhaul`

Common types: `feature`, `fix`, `refactor`, `chore`

---

## Git — Commit Style

Single line only. Under 75 characters. Capital letter, no trailing period, no prefix
tags (`feat:`, `fix:`, etc.), no body, no footer.

Each commit should teach — someone reading the git log should understand the sequence
of steps to build the feature. Split finely so each subject line is specific. One
concern per commit.

```
# Good
Fetch USAJobs listings with paginated API and auth headers
Map USAJobs salary from hourly to annual in normalizer
Add optional USAJOBS_API_KEY to env.ts server validation

# Bad
Add USAJobs scraper and normalizer  ← two concerns bundled
Add env vars                        ← too vague, doesn't say where or why
feat(tailor): add streaming         ← prefix tag
```

No `Co-Authored-By` footer.

---

## Environment Variables

```
DATABASE_URL                        # pooled (Prisma runtime)
DIRECT_URL                          # direct (migrations only)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET                # optional — webhook not yet built
OPENROUTER_API_KEY
USAJOBS_API_KEY                     # optional — USAJobs scraper
USAJOBS_EMAIL                       # optional — USAJobs scraper
ADZUNA_APP_ID                       # optional — Adzuna scraper
ADZUNA_APP_KEY                      # optional — Adzuna scraper
CRON_SECRET                         # protects /api/scrape and /api/analyze
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_DEFAULT_THEME=system
E2E_CLERK_USER_USERNAME             # Playwright test user (CI only)
E2E_CLERK_USER_PASSWORD             # Playwright test user (CI only)
```

`/api/scrape` and `/api/analyze` protected by `Authorization: Bearer {CRON_SECRET}` header.
Vercel sends this automatically for cron-triggered calls. Cron schedule: `0 7 * * *` (7am UTC).

---

## CI/CD

GitHub Actions CI runs on every push to `main` and every PR:

| Job | Depends on | Purpose |
|---|---|---|
| Type check | — | `pnpm tsc --noEmit` |
| Lint | — | `pnpm lint` (eslint) |
| Unit tests | — | `pnpm test:unit` (Vitest) |
| Playwright | typecheck + lint + unit | `pnpm test` (E2E, only if fast checks pass) |

Vercel auto-deploys `main` to production and PR branches to preview URLs.

---

## Settings Page Architecture

The settings page mixes profile-specific and account-level concerns. **Planned refactor**
to separate these into distinct sections or tabs.

**Profile-specific** (changes per profile):
- Profile info, search criteria, resume, CV, writing rules
- AI model overrides (`customTailorModel`, `customAnalyzeModel`, `customExtractModel`)

**Account-level** (shared across profiles):
- Usage monitor (token counts, call stats, reset date)
- Feedback form (also accessible via sidebar nav popover)
- Delete account (danger zone — preserves hashed usage by email)

---

## Session Start Checklist

1. Read `prisma/schema.prisma`
2. State what you're about to build and what files you'll touch
3. After completing: run `pnpm tsc --noEmit` and fix all type errors

Do not add dependencies without stating why and confirming first.
