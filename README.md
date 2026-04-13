# Shortlist

[![CI](https://github.com/mojoro/shortlist/actions/workflows/ci.yml/badge.svg)](https://github.com/mojoro/shortlist/actions/workflows/ci.yml)

**AI-powered job search, end to end.** Shortlist scrapes listings from six sources every morning, scores them against your profile with AI, lets you tailor your resume with one click, and tracks your entire pipeline — all in one place.

> Built by [John Moorman](https://johnmoorman.com) as a portfolio project. Currently single-user; SaaS roadmap in progress.

---

## Features

- **Scored feed** — Every listing is evaluated against your background and given a 0–100 match score with a plain-English verdict: GO, EXAMINE, or NO_GO. Weak matches are hidden automatically; strong ones surface to the top.
- **AI resume tailoring** — Side-by-side job description and resume editor. Click Generate and Claude streams a tailored draft in real time. Writing rules let you protect specific phrases, ban clichés, and prevent the AI from inventing achievements you don't have.
- **PDF export** — Export any tailored resume directly to PDF from the browser. No third-party service.
- **Pipeline tracker** — Kanban-style table: Saved → Applied → Interview → Offer. Tracks follow-up dates, notes, and the tailored resume used for each application.
- **Import anything** — Paste a URL or raw text from any job listing. Claude extracts the structured fields. Works with any company, not just supported ATS platforms.
- **Multi-profile** — One account, multiple independent job searches. "Frontend Berlin" and "Automation Remote" get completely separate feeds, criteria, and pipelines.
- **Daily scraping** — Six sources (Greenhouse, Lever, Ashby, USAJobs, Adzuna, Arbeitnow) scraped every morning via Vercel Cron. Pool-first architecture deduplicates globally before matching per-profile.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | [Neon](https://neon.tech) (PostgreSQL) |
| ORM | Prisma |
| Auth | [Clerk](https://clerk.com) |
| AI | [OpenRouter](https://openrouter.ai) — multiple models (see AI pipeline below) |
| Scraping | Greenhouse, Lever, Ashby, USAJobs, Adzuna, Arbeitnow |
| State | Zustand (client), React 19 `useOptimistic` |
| Testing | Playwright (E2E), Vitest + React Testing Library (unit) |
| CI/CD | GitHub Actions (typecheck → lint → unit → Playwright) |
| Scheduling | Vercel Cron (daily at 7am UTC) |
| PDF | `@react-pdf/renderer` |
| Markdown | `@uiw/react-md-editor` |
| Deployment | Vercel |

---

## Architecture

### Pool-first scraping

The scraper writes to a global `JobPool` table, deduplicated by `(source, externalId)`. A separate matching pass then creates `Job` junction rows — one per profile that matched the listing. This means the same posting is never fetched or stored twice regardless of how many profiles exist, and changing matching logic means re-running the match, not re-scraping.

```
JobPool  ──────────────────────────────────────
  └── Job (junction: one per profile match)
        ├── aiScore, feedStatus, userNotes
        └── Application → TailoredResume[]

User (Clerk ID)
  └── Profile (search context)
        ├── targetRoles, targetLocations, skills
        ├── curriculumVitae, masterResume
        ├── protectedPhrases, bannedPhrases     ← writing rules
        └── neverClaim, verifiedMetrics
```

### AI pipeline

- **Scoring** — Batches of 5 jobs, 500ms between batches, `anthropic/claude-haiku-4.5`. Pre-filter rejects excluded keywords without an API call. Response: `{ score, status, summary, matchPoints[], gapPoints[] }`.
- **Tailoring** — Streaming, `qwen/qwen3.5-397b-a17b`. Uses the full CV as content source and the master resume as format template. Writing rules are injected as hard constraints.
- **Extraction** — One-shot, `anthropic/claude-haiku-4.5`. Fetches a URL, strips HTML noise, converts to markdown, extracts structured fields.
- **Triage** — Batch classification of borderline candidates, `google/gemini-2.5-flash`.

All models are user-overridable per profile via Advanced Settings.

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- A [Neon](https://neon.tech) database (free tier works)
- A [Clerk](https://clerk.com) application
- An [OpenRouter](https://openrouter.ai) API key

### Setup

```bash
git clone https://github.com/mojoro/shortlist
cd shortlist
pnpm install
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env.local
```

Run the database migration and start the dev server:

```bash
pnpm prisma migrate dev
pnpm dev
```

Seed the database with realistic mock data (optional):

```bash
curl -X POST http://localhost:3000/api/dev/seed
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string (migrations only) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret (optional) |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `CRON_SECRET` | Random string — protects `/api/scrape` and `/api/analyze` |
| `USAJOBS_API_KEY` | USAJobs scraper (optional) |
| `USAJOBS_EMAIL` | USAJobs scraper (optional) |
| `ADZUNA_APP_ID` | Adzuna scraper (optional) |
| `ADZUNA_APP_KEY` | Adzuna scraper (optional) |
| `NEXT_PUBLIC_APP_URL` | Full URL of the deployment (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_DEFAULT_THEME` | `light` \| `dark` \| `system` |

### Triggering a scrape manually

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Add `?skipPool=1` to skip re-scraping and re-run the matching pass against the existing pool.

---

## Project Structure

```
src/
  app/
    (auth)/               # Clerk sign-in / sign-up pages
    (dashboard)/
      dashboard/          # Job feed — default view
      jobs/[id]/          # Job detail + match analysis
      tailor/[jobId]/     # Resume tailor — JD vs resume, streaming, export
      pipeline/           # Application tracker (table + Kanban board)
      settings/           # Profile + Account tabs
    api/
      scrape/             # POST — pool scrape + profile matching
      analyze/            # POST — AI scoring for unscored jobs
      tailor/             # POST — streams tailored resume
      tailor/save/        # POST — persists tailored resume draft
      jobs/extract/       # POST — AI field extraction from URL/text
      jobs/import/        # POST — saves a custom job listing
      webhooks/clerk/     # POST — Clerk webhook (user lifecycle)
    onboarding/           # Onboarding wizard for new users
    page.tsx              # Landing page
  components/
    dashboard/            # FeedToolbar, ProfileSwitcher
    jobs/                 # JobCard, JobFeed, ScoreBadge, ImportJobModal
    tailor/               # TailorPanel, GeneratePane, ResumePDFDocument, PDFPreview
    pipeline/             # PipelineTable, KanbanBoard, ApplicationDrawer, StatusSelect
    settings/             # SettingsClient, UsageSection, FeedbackForm
    layout/               # AppNav (collapsible sidebar + mobile tabs)
    landing/              # HeroDemoPreview, FeatureRow, LandingNav
    onboarding/           # OnboardingWizard
  lib/
    prisma.ts             # Prisma client singleton
    openrouter.ts         # OpenRouter client (server-only)
    models.ts             # Model constants + getModels() helper (client-safe)
    match-sql.ts          # SQL-based pool matching + rematch
    normalize.ts          # Source raw data → JobPool schema
    validations.ts        # Zod schemas for all API request bodies
    store.ts              # Zustand store (dashboard state)
    scrapers/             # greenhouse, lever, ashby, usajobs, adzuna, arbeitnow
  config/
    app.ts                # APP_CONFIG — app name lives here only
    companies.ts          # Company lists + search configs for all scrapers
prisma/
  schema.prisma           # Source of truth for DB schema
tests/
  *.spec.ts               # Playwright E2E tests
  unit/                   # Vitest unit tests
  global-setup.ts         # Playwright global setup — seeds test data
.github/
  workflows/ci.yml        # CI: typecheck → lint → unit → Playwright
```

---

## CI/CD

Every push to `main` and every pull request runs the full CI pipeline via GitHub Actions:

| Step | What it does |
|---|---|
| **Type check** | `pnpm tsc --noEmit` |
| **Lint** | ESLint |
| **Unit tests** | Vitest + React Testing Library |
| **E2E tests** | Playwright (runs against a Neon dev branch database) |

Playwright tests run after all other checks pass. Test reports are uploaded as artifacts and retained for 14 days. Vercel auto-deploys `main` to production and PR branches to preview URLs.

---

## Contributing

Contributions are welcome. This project uses the **Business Source License** (see below), so you can run it locally and submit pull requests freely — but you may not deploy it commercially without permission.

If you want to contribute:

1. **Open an issue first** for anything non-trivial. Describe what you want to change and why. This avoids wasted effort on PRs that won't be merged.
2. **Fork, branch, and PR.** Branch names follow `type/kebab-description` (e.g. `feature/email-notifications`, `fix/feed-filter`).
3. **One concern per PR.** Don't bundle a bug fix with a refactor.
4. **Pass CI.** Run `pnpm tsc --noEmit` and `pnpm test:unit` before submitting.

Areas where contributions are especially useful:

- New scraper sources (job boards with public APIs)
- Accessibility improvements
- Mobile UX
- Test coverage

---

## Roadmap

- [x] Clerk webhook — user lifecycle events (created, updated, deleted)
- [x] Onboarding wizard for new users
- [x] Multi-profile support with independent feeds and pipelines
- [x] USAJobs, Adzuna, and Arbeitnow scrapers (6 sources total)
- [x] Kanban board view for pipeline
- [x] User-configurable AI model overrides
- [ ] Email notifications for new high-score matches
- [ ] LinkedIn scraper
- [ ] SaaS billing (Stripe)

---

## License

This project is licensed under the **Business Source License 1.1 (BUSL-1.1)**.

**What this means in practice:**

- You can read, clone, fork, and contribute to this repository freely.
- You can run it locally for personal, non-commercial use.
- You **cannot** deploy it as a hosted service or use it commercially without a separate agreement.
- On **March 17, 2028** (two years after initial release), the license automatically converts to [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) — fully open source, no restrictions.

BUSL is not an OSI-certified open source license. It is source-available. The intent is to keep the code readable and contributable while reserving commercial rights until a potential SaaS launch.

See [LICENSE](./LICENSE) for the full text.

---

## Author

Built by [John Moorman](https://johnmoorman.com).
