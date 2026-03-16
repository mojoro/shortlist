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
| AI | OpenRouter API (`anthropic/claude-sonnet-4-6`) |
| Scraping | Apify (LinkedIn); direct HTTP for Greenhouse/Lever/Ashby |
| Scheduling | Vercel Cron |
| Theme | next-themes |
| PDF export | react-pdf |
| Markdown editor | @uiw/react-md-editor |
| React Compiler | babel-plugin-react-compiler (enabled) |
| Date formatting | date-fns |
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
      pipeline/           # Application tracker table
      layout.tsx          # Dashboard shell — AppNav, max-width wrapper
    api/
      scrape/             # POST — pool-first scrape + profile matching pipeline
      analyze/            # POST — AI scoring for unanalyzed jobs
      tailor/             # POST — streams tailored resume from Claude
      tailor/save/        # POST — persists tailored resume draft
      dev/seed/           # POST — dev-only seed route (not production)
      webhooks/
        clerk/            # ⚠ NOT YET IMPLEMENTED — critical for production
    onboarding/           # ⚠ Not yet built
    page.tsx              # Marketing / landing page
  components/
    dashboard/            # StatsRow
    jobs/                 # JobCard, JobFeed, ScoreBadge, JobDetailActions, JobNotesInput
    tailor/               # TailorPanel, GeneratePane, JobDescriptionPane,
                          #   ResumePDFDocument, PDFPreview, AutoSaveIndicator, MobileTabBar
    pipeline/             # PipelineTable, ApplicationDrawer, StatusSelect,
                          #   FollowUpBanner, PipelineStats, ResumePDFModal
    layout/               # AppNav
    providers/            # ThemeProvider
    ui/                   # Shared primitives: FilterChips, etc.
  lib/
    prisma.ts             # Prisma client singleton
    openrouter.ts         # OpenRouter client + MODEL constant
    match.ts              # jobMatchesProfile() — in-process pool filtering
    normalize.ts          # Source raw data → JobPool schema
    feed.ts               # groupJobsByDate() — date bucketing for feed display
    jobs.ts               # buildWhereClause(), buildOrderBy() — feed query helpers
    validations.ts        # Zod schemas for all API request bodies
    scrapers/
      greenhouse.ts       # Direct scraper for boards-api.greenhouse.io
      lever.ts            # ⚠ NOT YET BUILT
      ashby.ts            # ⚠ NOT YET BUILT
      linkedin.ts         # ⚠ NOT YET BUILT (Apify-backed)
    apify.ts              # ⚠ NOT YET BUILT
    salary.ts             # ⚠ NOT YET BUILT — formatSalary(amount, currency)
  config/
    app.ts                # APP_CONFIG — app name lives here ONLY
    companies.ts          # GREENHOUSE_COMPANIES — list of companies to scrape
  types/
    index.ts              # Shared TypeScript types derived from Prisma
  env.ts                  # Environment variable validation (@t3-oss/env-nextjs)
  middleware.ts           # Clerk auth + public route exemptions
prisma/
  schema.prisma           # Source of truth for DB schema
  seed.ts                 # Realistic mock data seed for development
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

Schema relationships:
```
JobPool (global — no user association)
  └── Job[] (junction — one per profile that matched this listing)

User (Clerk ID)
  └── Profile (one-to-many: "Frontend Berlin", "Automation Remote", etc.)
        ├── Job[] → Application → TailoredResume[]
        └── ScrapeRun[]

User → Usage (token consumption tracking)
```

---

## Authentication

```ts
import { auth } from "@clerk/nextjs/server";
const { userId } = await auth();
if (!userId) return new Response("Unauthorized", { status: 401 });
```

Clerk webhook at `/api/webhooks/clerk` creates `User` records. **⚠ Not yet
implemented — critical for production.** Without it, new sign-ups can't complete
onboarding (FK constraint on `Profile → User`).

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
package pointed at `https://openrouter.ai/api/v1`. Model: `anthropic/claude-sonnet-4-6`.

Before every AI call: check `Usage.currentMonthInputTokens < Usage.monthlyLimitInputTokens`.
After every call: increment token counts. Use `max_tokens: 1500` for scoring, `2000` for
tailoring.

**Scoring** (`/api/analyze`): Batches of 5 jobs, 500ms between batches. Jobs matching
an `excludedKeyword` are bulk-rejected without an API call. Response must be valid JSON:
`{ score, status: "GO"|"NO_GO"|"EXAMINE", summary, matchPoints[], gapPoints[] }`.
`NO_GO` → `feedStatus: HIDDEN`. Write model name to `Job.aiModel`.

**Tailoring** (`/api/tailor`): Streams plain markdown. Uses `curriculumVitae` as content
source (full CV), `masterResume` as format template (falls back to CV if null). System
prompt includes contact details and structured profile fields. Stream via `ReadableStream`
directly — no Vercel AI SDK.

---

## Scraping — Pool-First Architecture

**Layer 1 (global pool):** Scrape sources → write to `JobPool`. Deduplicated at
`@@unique([source, externalId])` via `createMany({ skipDuplicates: true })`.

**Layer 2 (profile matching):** Run `jobMatchesProfile()` in-process against the loaded
pool (newest 2000 entries, loaded once, reused for all profiles). Insert matched jobs as
`Job` junction rows. Same pool entry can appear in multiple profiles with different scores.

Pass `?skipPool=1` to skip layer 1 and match against existing pool.

**Matching logic** (`src/lib/match.ts`, short-circuit order):
1. Hard exclude — `excludedKeyword` in title → reject
2. Location filter — must match `targetLocations` or be remote-friendly
3. Role token match — tokenize `targetRole`, strip stopwords, match against title
4. Skill fallback — any `requiredSkill` in title → match
5. No criteria → everything passes

Cap: `MAX_CANDIDATES_PER_RUN = 30` per profile per run.

**Greenhouse** (`boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`) — free,
no auth. Company list in `src/config/companies.ts`. `externalId`: `greenhouse-{slug}-{id}`.

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

**Salary:** `formatSalary(amount, currency)` from `@/lib/salary.ts` — never hardcode
currency symbols.

---

## Git — Branch Naming

`type/kebab-description` — e.g., `feature/clerk-webhooks`, `fix/feed-filter`, `refactor/ui-overhaul`

Common types: `feature`, `fix`, `refactor`, `chore`

---

## Git — Commit Style

Single line only. Under 75 characters. Capital letter, no trailing period, no prefix
tags (`feat:`, `fix:`, etc.), no body, no footer.

```
# Good
Add streaming resume generation to the tailor route
Fix score badge colour not updating on re-analysis

# Bad
feat(tailor): add streaming        ← prefix tag
fixed bug                          ← too vague
Add streaming, fix badge, seed     ← multiple concerns
```

Atomic commits at the end of a feature are fine — no need to pause mid-implementation.
Never commit broken code. No `Co-Authored-By` footer.

---

## Environment Variables

```
DATABASE_URL          # pooled (Prisma runtime)
DIRECT_URL            # direct (migrations only)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
OPENROUTER_API_KEY
APIFY_API_TOKEN
CRON_SECRET           # protects /api/scrape and /api/analyze from public access
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_DEFAULT_THEME=system
```

`/api/scrape` and `/api/analyze` protected by `Authorization: Bearer {CRON_SECRET}` header.
Vercel sends this automatically for cron-triggered calls. Cron schedule: `0 7 * * *` (7am UTC).

---

## Session Start Checklist

1. Read `prisma/schema.prisma`
2. State what you're about to build and what files you'll touch
3. After completing: run `pnpm tsc --noEmit` and fix all type errors

Do not add dependencies without stating why and confirming first.
