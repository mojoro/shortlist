# Shortlist — CLAUDE.md

> **Renaming the app?** Change `APP_NAME` in `src/config/app.ts`. That's the only file
> that needs editing. Do not hardcode the app name anywhere else in the codebase.

---

## What This Is

Shortlist is a personal job search tool that aggregates listings from job boards, scores
them against the user's criteria using AI, and provides a resume tailoring workflow that
takes a job description and a master resume and produces a tailored, editable, exportable
resume. It also tracks the full application pipeline from "interested" to "offer/rejected"
in a Kanban-style board.

It is being built as a portfolio project by John Moorman (johnmoorman.com) and will
eventually be offered as a multi-user SaaS.

---

## App Config (name lives here and only here)

```ts
// src/config/app.ts
export const APP_CONFIG = {
  name: "Shortlist",
  tagline: "Your AI-powered job search, end to end.",
  url: "https://shortlist.johnmoorman.com", // update when domain is confirmed
} as const;
```

Import and use `APP_CONFIG.name` everywhere the app name appears in UI or metadata.
Never write the string `"Shortlist"` directly outside this file.

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
| AI | OpenRouter API (`anthropic/claude-3-haiku`) |
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
                          #   must create User record in Neon on Clerk user.created event
    onboarding/           # ⚠ Onboarding wizard not yet built
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
    match.ts              # jobMatchesProfile() — in-process pool filtering logic
    normalize.ts          # Source raw data → JobPool schema (normalizeGreenhouseForPool)
    feed.ts               # groupJobsByDate() — date bucketing for feed display
    jobs.ts               # buildWhereClause(), buildOrderBy() — feed query helpers
    validations.ts        # Zod schemas for all API request bodies
    scrapers/
      greenhouse.ts       # Direct scraper for boards-api.greenhouse.io
      lever.ts            # ⚠ NOT YET BUILT
      ashby.ts            # ⚠ NOT YET BUILT
      linkedin.ts         # ⚠ NOT YET BUILT (Apify-backed)
    apify.ts              # ⚠ NOT YET BUILT — Apify client + actor helpers
    salary.ts             # ⚠ NOT YET BUILT — formatSalary(amount, currency)
  config/
    app.ts                # APP_CONFIG — app name lives here
    companies.ts          # GREENHOUSE_COMPANIES — list of companies to scrape
  types/
    index.ts              # Shared TypeScript types derived from Prisma
  env.ts                  # Environment variable validation (@t3-oss/env-nextjs)
  middleware.ts           # Clerk auth + public route exemptions
prisma/
  schema.prisma           # Source of truth for DB schema
  seed.ts                 # Realistic mock data seed for development
```

**PDF rendering** lives in `components/tailor/ResumePDFDocument.tsx` (the react-pdf
document component) and `components/tailor/PDFPreview.tsx` (the viewer). There is no
separate `lib/pdf.ts` — rendering logic is co-located with the tailor UI.

---

## Database

Schema is defined in `prisma/schema.prisma`. Key relationships:

```
JobPool (global — no user/profile association)
  └── Job[] (junction rows — one per profile that matched this listing)

User (Clerk ID)
  └── Profile (one user, multiple profiles e.g. "Frontend Berlin", "Automation Remote")
        ├── Job[] (junction rows into JobPool — AI scores and feed state live here)
        │     └── Application (created when user moves job into pipeline)
        │           └── TailoredResume[] (versions generated for this application)
        └── ScrapeRun[] (log of each scraping execution — see Scraping section)

User
  └── Usage (token consumption tracking — soft cap per user per month)
```

**`Job` is a junction table.** It holds no job content — title, company, description,
location, and all other content fields live on `JobPool`. Always read job content via
`job.jobPool.*`. The `Job` row stores only what is profile-specific: AI scores,
`feedStatus`, `viewedAt`, `userNotes`, and the `Application` relation.

**Multi-tenancy rule:** Every DB query that touches `Job`, `Application`, or
`TailoredResume` must be scoped to `profileId`. Every API route must verify that the
requested `profileId` belongs to the authenticated Clerk user. Never trust a client-
supplied `profileId` without this check.

**Never discard raw scraper output.** Store verbatim source response in
`JobPool.rawData: Json`. The normalized fields on `JobPool` are derived from this.
If normalization logic changes, re-process from `rawData` rather than re-scraping.

---

## Authentication

Clerk handles all auth. The pattern everywhere:

```ts
// In Server Components / API routes:
import { auth } from "@clerk/nextjs/server";

const { userId } = await auth();
if (!userId) return new Response("Unauthorized", { status: 401 });
```

On first sign-in, Clerk fires a webhook to `/api/webhooks/clerk`. This route creates
the `User` record in Neon with the Clerk user ID as the primary key. Do not create
User records anywhere else.

The middleware at `src/middleware.ts` protects all `/dashboard` and `/api` routes
except `/api/webhooks/clerk`.

New users who have not completed the onboarding wizard (`Profile` count === 0) are
redirected to `/onboarding` by the middleware. Do not show them the feed until they
have at least one profile with a resume and search criteria set.

---

## AI Usage

All AI calls go through **OpenRouter** (`src/lib/openrouter.ts`), not the Anthropic SDK
directly. OpenRouter exposes an OpenAI-compatible API so use `openai` npm package pointed
at the OpenRouter base URL:

```ts
// src/lib/openrouter.ts
import OpenAI from "openai";

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL,
    "X-Title": APP_CONFIG.name,
  },
});

export const MODEL = "anthropic/claude-3-haiku";
```

### Scoring (`/api/analyze`)

Called after a scrape run for all jobs with `aiAnalyzedAt: null`. Also callable
standalone for manual re-analysis. Protected by `CRON_SECRET`.

**Keyword pre-filter (no API call)**

Before touching the AI, jobs whose title + description match an `excludedKeyword` are
bulk-updated to `feedStatus: HIDDEN, aiStatus: NO_GO, aiScore: 0` with a fixed summary.
This avoids paying for an API call on a job that would be rejected anyway.

**AI scoring**

System prompt includes: target roles, locations, remote preference, required skills,
nice-to-have skills, salary target, excluded keywords, and the first 1500 characters of
`Profile.masterResume`. Jobs are scored in batches of 5 (500ms delay between batches).
Each job is sent as a single chat completion. Response must be valid JSON:

```ts
{
  score: number,        // 0–100
  status: "GO" | "NO_GO" | "EXAMINE",
  summary: string,      // 1–2 sentences
  matchPoints: string[],
  gapPoints: string[]
}
```

If the response can't be parsed, `aiAnalyzedAt` is left null — the job is retried on
the next run. `NO_GO` results additionally get `feedStatus: HIDDEN`.

Always write the model name to `Job.aiModel` so we can track which version scored which
listings.

### Tailoring (`/api/tailor`)

Streaming route. System prompt instructs the model to rewrite the resume to mirror the
JD language, reorder bullets by relevance, and remove irrelevant content.

**Two resume fields serve different purposes:**
- `Profile.curriculumVitae` — the full CV: everything the candidate has ever done. Used
  as the content source for tailoring (what the AI rewrites from)
- `Profile.masterResume` — the curated base resume. Used as the format/style template.
  Falls back to `curriculumVitae` if `masterResume` is null.

The system prompt also includes contact details and structured profile data:
`displayName`, `email`, `phone`, `location`, `linkedinUrl`, `portfolioUrl`,
`githubUrl`, `skills`. These populate a header section in the tailored output.

Response streams as plain markdown.

Use `ReadableStream` directly — no Vercel AI SDK dependency. Pattern:

```ts
const stream = await openrouter.chat.completions.create({
  model: MODEL,
  stream: true,
  messages: [...],
  max_tokens: 2000,
});

const readable = new ReadableStream({
  async start(controller) {
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      controller.enqueue(text);
    }
    controller.close();
  },
});

return new Response(readable, {
  headers: { "Content-Type": "text/plain; charset=utf-8" },
});
```

### Cost controls

Every AI call must:
1. Check `Usage.currentMonthInputTokens` < `Usage.monthlyLimitInputTokens` before calling
2. Increment `Usage` token counts and call counts after the response
3. Use `max_tokens: 1500` for scoring, `max_tokens: 2000` for tailoring

---

## Scraping

### Pool-first architecture

The scrape pipeline runs in two layers via a single `POST /api/scrape` call.

**Layer 1 — Global pool**

All sources are scraped once and written to `JobPool` — a global table with no user or
profile association. Deduplication is enforced at `@@unique([source, externalId])` via
`createMany({ skipDuplicates: true })`. The same listing scraped on consecutive days
writes exactly one row. `JobPool.rawData` stores the verbatim source response — never
discard it, normalization is always re-derivable from it.

**Layer 2 — Profile matching**

After the pool is populated, every profile with `scraperEnabled: true` runs the match
filter in-process against the loaded pool (newest 2000 entries, loaded once and reused
for all profiles). Matched jobs that aren't already in the profile's feed are inserted
as `Job` junction rows. The same pool entry can surface in multiple profiles with
different AI scores — scoring is always profile-specific.

```
JobPool (scraped once)
  └── Job (profile A) ← matched + scored against A's criteria
  └── Job (profile B) ← matched + scored against B's criteria
```

Pass `?skipPool=1` to skip layer 1 and run matching against the existing pool. Useful
for testing profile criteria against already-scraped data without re-hitting source APIs.

### Profile matching logic (`src/lib/match.ts`)

`jobMatchesProfile(job, profile)` runs in-process against the pool array — no DB query
per job. Rules applied in order, short-circuiting on first decision:

1. **Hard exclude** — any `excludedKeyword` in title → reject immediately
2. **Location filter** — if `targetLocations` is set, job must match a target city or
   be remote-friendly (`remote`, `anywhere`, `worldwide`, `distributed` in location
   string). `REMOTE_ONLY` profiles only accept remote-signalled locations.
3. **Role token match** — each `targetRole` is tokenized; generic stopwords (`engineer`,
   `developer`, `senior`, `software`, etc.) are stripped; remaining tokens matched
   against title. If all tokens were stopwords, falls back to exact phrase match.
4. **Skill fallback** — any `requiredSkill` in title → match (catches "React Developer"
   for a "Frontend Engineer" search)
5. **No criteria** — if profile has no roles or skills, everything passes through

Cap: `MAX_CANDIDATES_PER_RUN = 30` per profile per run.

### Scrape run logging

Two types of `ScrapeRun` record per run:
- `profileId: null` — pool-level run. Records `jobsFound` (raw count from source) and
  `jobsInPool` (net new added to pool)
- `profileId: set` — per-profile match run. Records `jobsNew` (net new matched into feed)

After matching, if any new jobs were added for a profile, `POST /api/analyze` is
triggered fire-and-forget for that profile.

### Scraper adapter pattern

Every scraper exports a function that returns verbatim source output. `normalize.ts`
maps each source's raw type to `Prisma.JobPoolUncheckedCreateInput`. The scraper
function currently receives a `_profileId` parameter that is unused — it is reserved
for when the company list moves to per-profile settings.

### Greenhouse scraper (`src/lib/scrapers/greenhouse.ts`)

Uses the public Greenhouse Boards API — no auth, no bot detection:
```
GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
```
Per-company failures are silently skipped. Company list: `src/config/companies.ts`
(`GREENHOUSE_COMPANIES` array). This is the only file to edit to add/remove companies
until per-profile company management is built in settings.

`externalId` format: `greenhouse-{slug}-{numericJobId}`

HTML job descriptions are stripped to plain text via regex in `normalize.ts` — no DOM
dependency, runs safely in a Route Handler.

### Priority sources for Berlin/Poland market

1. **Greenhouse** — `boards-api.greenhouse.io` — free, clean, no bot detection ✓ built
2. **Lever** — `jobs.lever.co` — free, consistent markup — ⚠ not yet built
3. **Ashby** — `jobs.ashby.io` — free, clean API-style endpoints — ⚠ not yet built
4. **LinkedIn** — Apify actor, costs money, use for premium signal — ⚠ not yet built
5. **No Fluff Jobs** — Polish market, Apify actor — ⚠ not yet built

---

## Salary Handling

All salary values stored as integers (annual, local currency). Currency stored separately
on the `Profile` model (`currency` field, default `"EUR"`).

```ts
// src/lib/salary.ts
export const formatSalary = (amount: number, currency: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
```

Never hardcode currency symbols. Always use `formatSalary`.

---

## Resume Tailor Flow

1. User opens a job → clicks "Tailor Resume"
2. `/tailor/[jobId]` loads: JD on left, master resume on right (from `Profile.masterResume`)
3. User clicks "Generate" → POST `/api/tailor` → streams tailored markdown into right panel
4. Right panel becomes editable via `@uiw/react-md-editor` once stream completes
5. User edits to add their voice
6. User clicks "Export PDF" → `react-pdf` renders markdown → download triggered
7. On export:
   - Create or upsert `Application` record for this job (status: `APPLIED` if not already set)
   - Create `TailoredResume` record with the exported markdown
   - Set `Application.exportedResumeMarkdown` and `Application.exportedAt`
   - Set `Job.feedStatus` to `SAVED` if not already in pipeline

---

## Application Pipeline (Kanban)

ApplicationStatus enum maps to columns:

| Column | Status value |
|---|---|
| Interested | `INTERESTED` |
| Applied | `APPLIED` |
| Screening | `SCREENING` |
| Interviewing | `INTERVIEWING` |
| Offer | `OFFER` |
| Closed | `ACCEPTED` / `REJECTED` / `WITHDRAWN` / `GHOSTED` |

Default view is table. Drag-and-drop Kanban is a stretch goal — build table first.
Status changes write immediately to `Application.status` and `Application.statusUpdatedAt`.

---

## Component Conventions

- React Compiler is enabled. Do not write `useMemo`, `useCallback`, or `React.memo`
  manually — the compiler handles all memoization automatically. Writing them anyway
  is redundant and clutters the code.
- If the compiler opts a component out (you'll see a warning in the console), it means
  that component violates the Rules of Hooks. Fix the violation rather than adding manual
  memoization as a workaround.
- Server Components by default. Add `"use client"` only when interactivity requires it.
- Never put `"use client"` on a layout or page. Extract client islands.
- Framer Motion for meaningful transitions only. Wrap in `useReducedMotion` check.
- All data fetching in Server Components or API routes. No client-side fetch waterfalls.
- Loading states via Next.js `loading.tsx` files and React Suspense boundaries.
- Error states via `error.tsx` files.

---

## Visual Design

### Audience

Shortlist is a product for everyone looking for a job — not just developers. A recruiter,
a graphic designer, a recent graduate, and a software engineer should all feel equally at
home. The UI must never feel like a developer tool. No terminal aesthetics, no jargon,
no raw JSON visible to the user. Every label, empty state, and error message should be
written in plain human language.

### Light and dark mode

Both modes are first-class. Use `next-themes` for theme management. The default is system
preference. A toggle is visible in the nav on every page.

Design light mode first — it is the more demanding constraint and the one most non-
technical users will encounter. Dark mode should feel equally polished, not like an
afterthought.

Define all colours as CSS custom properties with both `:root` (light) and
`.dark` (dark) values. Never hardcode a colour value in a component.

```css
:root {
  --bg:          #ffffff;
  --bg-subtle:   #f5f5f7;
  --border:      #e4e4e7;
  --text:        #18181b;
  --text-muted:  #71717a;
  --accent:      /* your primary brand colour */;
  --accent-fg:   /* text on accent background */;
}

.dark {
  --bg:          #0f0f12;
  --bg-subtle:   #18181b;
  --border:      #27272a;
  --text:        #fafafa;
  --text-muted:  #a1a1aa;
  /* accent stays consistent across modes unless contrast requires change */
}
```

### Typography

Pair a warm, approachable display font with a highly legible body font. Avoid anything
that reads as technical or cold. No monospace in the UI except inside the resume editor
and exported PDF, where it is appropriate. Use `next/font` for zero-FOUT loading.

### Score display

Score badges must be immediately readable by a non-technical user. The number alone is
not enough — pair it with a human label:

- 90+ → "Strong match" (green)
- 75–89 → "Good match" (yellow/amber)
- below 75 → "Weak match" (red/muted)

The raw number is secondary. A non-technical user should never need to know what 81
means — the label tells them.

### Language and copy

- No jargon. "Applicant Tracking System" → "your job pipeline". "Scrape" → "find jobs".
  "AI analysis" → "match score". "Master resume" → "your base resume".
- Empty states must be helpful and encouraging, not blank. A new user who just signed up
  should see a warm prompt explaining what to do next, not an empty table.
- Error messages must explain what went wrong in plain language and suggest a next step.
  Never show a raw error code or stack trace to a user.
- Tooltips on any non-obvious UI element. Never assume the user knows what a feature does.

### Onboarding

The sign-up flow must be seamless for a non-technical person. The sequence:

1. **Sign up** via Clerk (email or Google OAuth — both must work, Google is one click)
2. **Welcome screen** — brief, friendly, explains what Shortlist does in two sentences
3. **Profile setup wizard** — collect the minimum needed to make the app useful:
   - What kind of job are you looking for? (free text or suggestion chips)
   - Where? (location + remote preference)
   - Paste your resume (large textarea, clearly labelled, with a placeholder example)
   - What salary are you targeting? (range slider, not raw number inputs)
4. **First scrape triggered automatically** on wizard completion — user lands on the
   feed with real (or seeded) jobs already appearing, not a blank screen
5. **Inline guidance** on the feed for first-time users — a dismissable banner
   explaining what the match score means and how to use the tailor feature

The wizard must be completable in under two minutes. Every field except resume paste
should have a sensible default so a user can click through without getting stuck.

Progress through the wizard is saved to the database at each step so a user who drops
off mid-wizard picks up where they left off on next login.

### General UI rules

- Touch targets minimum 44×44px
- All interactive elements have visible focus states (keyboard navigable)
- Loading states on every async action — no silent waits
- Confirm before any destructive action (delete, withdraw application)
- Mobile-responsive — the feed and pipeline views must work on a phone screen

---

## Environment Variables

```bash
# Neon
DATABASE_URL=          # pooled connection (Prisma runtime)
DIRECT_URL=            # direct connection (Prisma migrations)

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Anthropic (via OpenRouter — do not use Anthropic SDK directly)
OPENROUTER_API_KEY=

# Apify
APIFY_API_TOKEN=

# Cron
CRON_SECRET=           # long random string — protects /api/scrape from public access

# App
NEXT_PUBLIC_APP_URL=   # e.g. https://shortlist.johnmoorman.com

# Theme
NEXT_PUBLIC_DEFAULT_THEME=system  # "light" | "dark" | "system"
```

---

## Git Conventions

### Atomic commits

Every commit does exactly one thing. If a commit touches more than one concern, it should
be split. Ask yourself: "Can I describe this in a single short sentence?" If not, split it.

**Never bundle:**
- A feature and its tests
- Two unrelated bug fixes
- A refactor and a new feature
- A UI change and an API change

### Commit message format

Write the message as the completion of the sentence **"This commit will..."** — then drop
that prefix. Start with a capital letter. No period at the end. No prefix tags (no
`feat:`, `fix:` etc.). Keep it under 75 characters.

```
# Good
Add streaming resume generation to the tailor route
Fix score badge colour not updating on re-analysis
Seed 15 realistic mock jobs for Berlin tech market
Extract JobCard into its own component
Add currency field to Profile model

# Bad
feat(tailor): add streaming resume generation via Anthropic API  ← prefix tags, too long
fixed bug                                                         ← too vague
Add streaming resume generation, fix score badge, seed mock data  ← multiple concerns
```

### When to commit

Commit after each meaningful, working unit of progress:
- A new route is wired up and returns correct data
- A component renders correctly with real data
- A migration is written and applied
- A bug is fixed and verified
- A config or environment change is complete

Do not commit broken code. Do not commit "WIP" unless explicitly branching for it.

---

## Environment Variable Validation

Validate all environment variables at startup so a missing var crashes loudly at boot
time, not silently deep inside a route handler at runtime. Use `@t3-oss/env-nextjs`:

```ts
// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL:         z.string().url(),
    DIRECT_URL:           z.string().url(),
    CLERK_SECRET_KEY:     z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().min(1),
    OPENROUTER_API_KEY:   z.string().min(1),
    APIFY_API_TOKEN:      z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL:               z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL:                      process.env.DATABASE_URL,
    DIRECT_URL:                        process.env.DIRECT_URL,
    CLERK_SECRET_KEY:                  process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET:              process.env.CLERK_WEBHOOK_SECRET,
    OPENROUTER_API_KEY:                process.env.OPENROUTER_API_KEY,
    APIFY_API_TOKEN:                   process.env.APIFY_API_TOKEN,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL:               process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

Import from `~/env` everywhere instead of `process.env` directly. This gives you type
safety on all env vars and a clear error message if one is missing on deploy.

---

## Neon + Prisma Connection Config

Neon requires specific connection string configuration. The pooled URL (used at runtime)
must have connection limit parameters appended. The direct URL (used for migrations only)
must not go through the pooler.

```bash
# .env
DATABASE_URL="postgresql://...@ep-xxx.neon.tech/neondb?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...@ep-xxx.neon.tech/neondb"
```

In `prisma/schema.prisma` the datasource must reference both:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Migration discipline:**
- Development: `pnpm prisma migrate dev --name <description>`
- Production (Vercel): `pnpm prisma migrate deploy` (runs in build step)
- Never use `prisma db push` — it bypasses migration history
- Add `prisma migrate deploy` to the Vercel build command:
  `"build": "prisma migrate deploy && next build"`

---

## Vercel Function Timeouts

Vercel Hobby plan: **10 second** function timeout. Pro plan: **60 seconds**.

The scrape route and AI analysis route will both exceed 10 seconds for any meaningful
workload. You must be on Pro, or configure `maxDuration` per route:

```ts
// app/api/scrape/route.ts
export const maxDuration = 60; // seconds — requires Vercel Pro

// app/api/analyze/route.ts
export const maxDuration = 60;
```

For the tailor streaming route, streaming responses are not subject to the same timeout
as regular responses — but the time-to-first-byte still must be under `maxDuration`.

If a scrape run genuinely risks exceeding 60 seconds (e.g. scraping multiple sources),
trigger it as a background job via Vercel Cron rather than a user-initiated request.
Return a 202 immediately and let the cron job do the work.

---

## Clerk Webhook Verification

**⚠ This route is not yet implemented — it is critical for production.**

Without it, new users who sign up via Clerk will have a valid auth session but no `User`
row in the database. Since `Profile` has a foreign key to `User`, any attempt to create
a profile (i.e. complete onboarding) will fail with a FK constraint error. The app
currently works in development only because the seed script creates the test user
directly. This must be built before the app can accept real users.

The `/api/webhooks/clerk` route must verify the Svix signature on every request or it
is an unauthenticated endpoint that anyone can call to create arbitrary User records.

```ts
import { Webhook } from "svix";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = headers();

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id":        headersList.get("svix-id") ?? "",
      "svix-timestamp": headersList.get("svix-timestamp") ?? "",
      "svix-signature": headersList.get("svix-signature") ?? "",
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    await prisma.user.create({ data: { id: evt.data.id } });
  }

  return new Response("OK", { status: 200 });
}
```

---

## Known SSR Issues — Dynamic Imports Required

Two dependencies have SSR incompatibilities in Next.js and must be loaded client-side
only via dynamic import. Failing to do this will cause build failures or hydration errors.

```ts
// The markdown editor — import with ssr: false wherever used
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// react-pdf — wrap the PDF viewer/renderer in a client component with ssr: false
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then(m => m.PDFViewer),
  { ssr: false }
);
```

Do not attempt to render either of these in a Server Component.

---

## Error Handling

### API routes

Every API route must return structured errors the frontend can act on:

```ts
// Consistent error response shape
return Response.json(
  { error: "Something went wrong", code: "SCRAPE_FAILED" },
  { status: 500 }
);
```

Never let unhandled exceptions propagate to the user. Wrap route handlers in try/catch.
Log the real error server-side; return a human-readable message client-side.

### User-facing errors

- Never show a raw error message, status code, or stack trace in the UI
- Every error state needs a message and a suggested action:
  - "We couldn't find new jobs right now. Try again in a few minutes." + Retry button
  - "Resume generation failed. Your base resume is still saved." + Try again button
- Use `error.tsx` boundary files to catch rendering errors gracefully

### AI failures

If an AI scoring or tailoring call fails, do not block the user. Fail silently per job:
- Scoring failure: leave `aiAnalyzedAt` null, surface job in feed with "Not yet scored"
  label, retry on next scrape run
- Tailor failure: show inline error with retry button, do not lose the JD panel

---

## AI Batch Processing

When a scrape run returns 30+ new jobs, do not fire 30 parallel AI calls. Batch them:

```ts
// Process in batches of 5 with a small delay between batches
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;

for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
  const batch = jobs.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(job => analyzeJob(job, profile)));
  if (i + BATCH_SIZE < jobs.length) {
    await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }
}
```

This prevents rate limit errors from OpenRouter and keeps costs predictable.

---

## Profile Switching

The active profile is stored in a **cookie** (`shortlist-active-profile`), not solely
via the `isActive` database flag. The cookie approach avoids race conditions when a user
has multiple tabs open and prevents an extra DB write on every profile switch.

```ts
// When user switches profile:
// 1. Set cookie client-side (immediate, no round trip)
cookies().set("shortlist-active-profile", profileId, { path: "/" });

// 2. Sync isActive flag to DB in the background (non-blocking)
fetch("/api/profiles/activate", { method: "POST", body: JSON.stringify({ profileId }) });
```

Middleware reads the cookie to determine the active profile for the current request.
If the cookie is missing or invalid, default to the user's first profile.

---

## Resume Upload (PDF → Text)

Non-technical users may not know how to copy-paste resume text. Support PDF upload as
an alternative input on the onboarding wizard and settings page.

Use `pdf-parse` to extract text server-side in an API route:

```ts
// app/api/resume/parse/route.ts
import pdfParse from "pdf-parse";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { text } = await pdfParse(buffer);
  return Response.json({ text: text.trim() });
}
```

File size limit: 5MB. Validate on client before upload. After extraction, the text
populates the same `Profile.masterResume` field as manual paste — there is no separate
storage path for uploaded vs pasted resumes.

---

## Local Development Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and fill in values
cp .env.example .env.local

# 3. Run database migrations
pnpm prisma migrate dev

# 4. Seed mock data
pnpm prisma db seed

# 5. Start dev server
pnpm dev
```

The seed script (`prisma/seed.ts`) creates:
- One test user (bypasses Clerk in seed context — use a fixed fake Clerk ID)
- Two profiles: "Frontend Engineer — Berlin" and "Automation Engineer — Remote"
- 15 realistic mock jobs per profile with varied scores, statuses, and sources
- 3 applications with different pipeline statuses

Seed data should reflect the real Berlin/Poland tech market: real company names
(Kombo, Taktile, Cogram, No Fluff Jobs listings), realistic salary ranges, real
tech stacks. Do not use placeholder data like "Company A" or "Job Title 1".

---

## Next.js 15 Breaking Changes

Next.js 15 made several APIs async that were synchronous in v14. Claude Code will
write v14 patterns by default and they will silently break. Enforce these everywhere:

```ts
// ❌ v14 — WRONG in Next.js 15
export default function Page({ params }: { params: { id: string } }) {
  const id = params.id;
}

// ✅ v15 — params is now a Promise
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// Same applies to searchParams:
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams;
}

// cookies() and headers() are also async:
import { cookies, headers } from "next/headers";
const cookieStore = await cookies();
const headersList = await headers();
```

This affects every dynamic route (`jobs/[id]`, `tailor/[jobId]`) and every route that
reads cookies or headers. Flag any instance of synchronous `params`, `cookies()`, or
`headers()` access as a bug.

---

## Prisma Client Singleton

Next.js hot reload in development creates a new Prisma client on every file change,
rapidly exhausting the Neon connection pool. Use the singleton pattern:

```ts
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Import `prisma` from `~/lib/prisma` everywhere. Never call `new PrismaClient()` directly
outside this file.

---

## TypeScript Path Aliases

Configure `@/` as the import alias for `./src` to avoid `../../../` relative hell.

```json
// tsconfig.json — ensure these are present:
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

All imports use `@/` prefix:

```ts
import { prisma }     from "@/lib/prisma";
import { APP_CONFIG } from "@/config/app";
import { JobCard }    from "@/components/jobs/JobCard";
```

Never use relative imports that traverse more than one directory level.

---

## next.config.ts

The `next.config.ts` file must be set up before the first build. Missing configuration
causes silent failures on image loading and deployment.

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true, // enabled during project init — do not remove
  },
  images: {
    remotePatterns: [
      // Clearbit logo API for company logos in job cards
      { protocol: "https", hostname: "logo.clearbit.com" },
      // Clerk avatar CDN
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  // Required for @uiw/react-md-editor
  transpilePackages: ["@uiw/react-md-editor", "@uiw/react-markdown-preview"],
};

export default nextConfig;
```

Company logos: use `https://logo.clearbit.com/{domain}` with a fallback to a generic
building icon if the request 404s. Extract the domain from the job's `url` field.
Never block a job card render on a failed logo fetch.

---

## Middleware Implementation

The full middleware pattern for this app — Clerk auth + onboarding redirect + active
profile resolution:

```ts
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk",
  "/api/scrape",   // protected by CRON_SECRET instead
  "/api/analyze",  // protected by CRON_SECRET instead
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId } = await auth();
  if (!userId) return auth.redirectToSignIn();

  // Redirect incomplete onboarding (checked via cookie set on wizard completion)
  const onboarded = req.cookies.get("shortlist-onboarded")?.value;
  const isOnboardingRoute = req.nextUrl.pathname.startsWith("/onboarding");

  if (!onboarded && !isOnboardingRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
```

Note: Use a cookie (`shortlist-onboarded`) for the onboarding check in middleware rather
than a DB query — middleware runs on every request and a DB query here would add
unacceptable latency to every page load.

**DB fallback pattern:** The cookie-only approach breaks when users sign in on a new
device or clear their browser storage. To handle this, when the `shortlist-onboarded`
cookie is absent, middleware calls the internal `/api/check-onboarding` route (forwarding
the Clerk session cookie). That route uses Prisma to query
`profile.count({ where: { userId, onboardingCompletedAt: { not: null } } })`. If count
> 0, the cookie is set on the response and the request proceeds. If count === 0, the
user is redirected to `/onboarding`. This is a one-time cost per session/device — once
the cookie is restored, all subsequent requests short-circuit at the cookie check.

`onboardingCompletedAt` is written by `completeOnboarding()` in
`src/app/(dashboard)/settings/actions.ts` when the onboarding wizard creates the first
Profile record.

**Why an internal API route instead of direct Prisma in middleware:** Next.js middleware
runs in the Edge Runtime, which does not support Node.js APIs that Prisma depends on.
`@neondatabase/serverless` (the Edge-compatible Neon driver) is not in this project's
dependencies — the internal route approach avoids adding that dependency.

---

## Vercel Cron Configuration

Cron jobs are configured in `vercel.json` at the project root. The scrape route must
also verify a secret header to prevent anyone on the internet from triggering it directly.

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/scrape",
      "schedule": "0 7 * * *"
    }
  ]
}
```

This fires the scrape route daily at 7am UTC. Adjust the schedule per user preference
once settings are wired up.

Protect the route with a cron secret:

```ts
// app/api/scrape/route.ts
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ... rest of handler
}
```

Add `CRON_SECRET` to your env vars — a long random string. Vercel automatically sends
this header when triggering cron jobs if you set it in the project settings.

---

## API Request Validation

Every POST/PATCH route must validate its request body with Zod before touching the
database. Never trust client-supplied data.

```ts
// Pattern for every mutating API route:
import { z } from "zod";

const schema = z.object({
  jobId:  z.string().cuid(),
  status: z.enum(["INTERESTED", "APPLIED", "SCREENING", "INTERVIEWING", "OFFER",
                   "ACCEPTED", "REJECTED", "WITHDRAWN", "GHOSTED"]),
});

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { jobId, status } = parsed.data;
  // ... proceed safely
}
```

Define schemas in `src/lib/validations.ts` and import them into route handlers.
Do not define schemas inline in route files.

---

## Pagination

The job feed can accumulate hundreds of jobs quickly. Use **cursor-based pagination**,
not offset (`skip`/`take`). Offset pagination produces wrong results when new items are
inserted between page loads.

```ts
// Cursor-based pagination pattern
const jobs = await prisma.job.findMany({
  where:   { profileId, feedStatus: { not: "HIDDEN" } },
  orderBy: { postedAt: "desc" },
  take:    25,
  // On subsequent pages, pass the last item's id as cursor:
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
});

// Return the next cursor with the response:
const nextCursor = jobs.length === 25 ? jobs[jobs.length - 1].id : null;
return Response.json({ jobs, nextCursor });
```

The feed UI uses an "Load more" button (not infinite scroll — infinite scroll is
disorienting on a feed where users return to re-read items). Default page size: 25.

---

## Date Formatting

Install `date-fns` for all date display. Never use `new Date().toLocaleDateString()`
directly in components — it produces inconsistent output across locales and SSR/client.

```ts
import { formatDistanceToNow, format } from "date-fns";

// "2 hours ago", "3 days ago"
formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })

// "Mar 10, 2026"
format(new Date(job.postedAt), "MMM d, yyyy")
```

All dates stored in the DB are UTC. Display in the user's local timezone via `date-fns`
(it uses the browser's timezone automatically on the client). On the server, format dates
as relative strings only when the component is a Client Component — Server Components
that format dates will produce timezone mismatches.

---

## Optimistic UI

Kanban status changes and feed actions (save, archive) must feel instant. Do not wait
for the server response before updating the UI — use optimistic updates.

Pattern using `useOptimistic` (React 19, available in Next.js 15):

```ts
"use client";
import { useOptimistic, useTransition } from "react";

const [optimisticStatus, setOptimisticStatus] = useOptimistic(application.status);
const [isPending, startTransition] = useTransition();

const handleStatusChange = (newStatus: ApplicationStatus) => {
  startTransition(async () => {
    setOptimisticStatus(newStatus); // immediate UI update
    await updateApplicationStatus(application.id, newStatus); // background server call
  });
};
```

If the server call fails, React automatically rolls back the optimistic state. Show a
toast notification on failure: "Couldn't update status. Please try again."

---

## .gitignore and .env Discipline

Commit `.env.example` with all variable names but no values. Never commit `.env.local`
or `.env`. This is the contract between the repo and anyone who clones it.

```bash
# .env.example — commit this
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
OPENROUTER_API_KEY=
APIFY_API_TOKEN=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_DEFAULT_THEME=system
```

Ensure `.gitignore` contains:

```
.env
.env.local
.env.*.local
```

Never store secrets in `next.config.ts`, hardcoded in source files, or in public
environment variables (`NEXT_PUBLIC_*`) — the latter are bundled into client JavaScript
and visible to anyone.

---

## Claude Code Instructions

**Model:** claude-sonnet-4-6
**Intensity:** High
**Auto-accept:** Off — review each change before accepting

When starting a session:
1. Read this file in full
2. Read `prisma/schema.prisma`
3. State what you're about to build and what files you'll touch before writing any code
4. After completing a task, run `pnpm tsc --noEmit` and fix all type errors before stopping

Do not:
- Add dependencies without stating why and confirming
- Write `any` types
- Put `"use client"` on pages or layouts
- Hardcode the app name — use `APP_CONFIG.name`
- Make database queries without scoping to `profileId`
- Call the OpenRouter API without checking usage limits first
- Access `params`, `cookies()`, or `headers()` synchronously — they are Promises in Next.js 15
- Use relative imports that traverse more than one directory level — use `@/` aliases
- Call `new PrismaClient()` directly — import from `@/lib/prisma`
- Use `prisma db push` — always use `prisma migrate dev`
- Define Zod schemas inline in route files — put them in `@/lib/validations.ts`
- Use offset pagination (`skip`/`take`) on the job feed — use cursor-based pagination
- Format dates with `toLocaleDateString()` — use `date-fns`
- Store secrets in `NEXT_PUBLIC_*` env vars
- Read job content fields (title, company, description, location, etc.) directly from
  `Job` — `Job` is a junction table, all content lives on `JobPool`. Always use
  `job.jobPool.title`, `job.jobPool.description`, etc., and include `jobPool: true` in
  Prisma queries that need job content