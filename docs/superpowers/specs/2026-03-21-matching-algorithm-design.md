# Three-Tier Matching Pipeline

**Date:** 2026-03-21
**Branch:** `feature/matching-algorithm`
**Status:** Design

## Problem

The current matching algorithm is a single SQL pass that checks job titles with
ILIKE patterns. This causes two classes of failure:

1. **Noise (too many irrelevant matches):** Tokenizing "AI Engineer" strips
   "Engineer" as a stopword, leaving `%ai%` which matches retail jobs, company
   names, and anything containing the letters "ai". Short tokens are the root
   cause — any role containing a common abbreviation or short word produces
   false positives.

2. **Remote job flooding:** A US user searching for remote work gets every
   remote job worldwide. A listing requiring a Bangladeshi visa to work floods
   into a feed meant for US-eligible roles. There's no concept of work
   eligibility — `targetLocations` conflates "where I want to work" with
   "where I can legally work."

Secondary issues: the `description`, `skills[]`, `salary*`, `jobType`, and
`companySize` fields on JobPool are completely unused during matching. The 30-job
cap per run artificially limits results even when many genuine matches exist.

## Design

Replace the single SQL pass with a three-tier pipeline that progressively
narrows candidates:

```
Pool → Tier 1 (SQL pre-filter) → Tier 2 (Heuristic) → Tier 3 (AI triage) → Feed
         loose, fast               in-process scoring     borderline only
         ~seconds                  ~seconds               ~seconds (batched)
```

All Tier 1 output goes to Tier 2 — Tier 1 never directly admits jobs to the
feed. Tier 2 classifies candidates as ACCEPT (enters feed), BORDERLINE (sent to
Tier 3), or REJECT (dropped). Tier 3 makes a final MATCH/REJECT decision on
borderlines only.

### Pipeline separation

The match step becomes its own route, decoupled from scrape:

| Step | Trigger | Route | Duration budget |
|---|---|---|---|
| Scrape | Cron (7am UTC) | `POST /api/scrape` | 60s (existing) |
| Match | Fire-and-forget from scrape, or standalone | `POST /api/match` | 120s (`maxDuration = 120`) |
| Analyze | Separate cron | `POST /api/analyze` | existing |

`/api/scrape` finishes pool population, then fires an HTTP call to `/api/match`
without awaiting the response (fire-and-forget via `fetch` with no `await` on
the response body, or `waitUntil` if available). This keeps the scrape route
within its 60s budget while giving match its own independent execution window.

`/api/match` can also be triggered independently via the same `CRON_SECRET`
auth (useful for rematch-on-criteria-change from settings).

**Estimated time budget per profile:** Tier 1 ~2s, Tier 2 ~1s, Tier 3 ~3-5s
(1-3 parallel AI calls). With 120s budget, the route comfortably handles 10+
profiles.

## Schema Changes

### JobPool — new columns

```prisma
model JobPool {
  // ... existing fields ...
  country     String?   // ISO 3166-1 alpha-2 uppercase (e.g. "US", "DE", "GB")
  region      String?   // Sub-country region (e.g. "California", "Berlin")
}
```

Populated during normalization by a location parser (see Location Parser
section). Null means "could not determine" — treated as unknown origin during
eligibility filtering.

Add index for country-based queries:
```prisma
@@index([country])
```

All country values must be stored as uppercase ISO 3166-1 alpha-2 codes.
Normalizers that already know the country (Adzuna, USAJobs) should set it
directly with `.toUpperCase()` rather than waiting for the location parser.

### Job — new columns

```prisma
model Job {
  // ... existing fields ...
  matchTier       MatchTier?   // Which pipeline tier admitted this job
  matchConfidence Float?       // 0.0–1.0 confidence from admitting tier
}
```

`matchTier` records which tier admitted the job: `HEURISTIC` for tier 2 accepts,
`AI_TRIAGE` for tier 3 accepts. Existing jobs pre-dating this migration will
have `matchTier: null` and `matchConfidence: null` — all code must treat null
as "legacy match, tier unknown."

`matchConfidence` semantics by tier:
- `HEURISTIC`: the 0.0–1.0 composite score from tier 2 (>= 0.6)
- `AI_TRIAGE`: fixed value of 0.5 for all AI-admitted jobs (the AI returns
  yes/no, not a score — 0.5 indicates "borderline, AI-approved")

This field is for observability, not sorting. The existing `aiScore` from
`/api/analyze` remains the primary sort signal.

### Profile — new columns

```prisma
model Profile {
  // ... existing fields ...
  workEligibility String[]  // ISO 3166-1 alpha-2 codes ["US", "DE"]
}
```

Separates "where I can legally work" from `targetLocations` ("where I want to
work"). Populated during onboarding and editable in settings.

### Usage — new columns

```prisma
model Usage {
  // ... existing fields ...
  triageCallCount    Int @default(0)
  triageInputTokens  Int @default(0)
  triageOutputTokens Int @default(0)
}
```

### New enum

```prisma
enum MatchTier {
  HEURISTIC
  AI_TRIAGE
}
```

### New model: MatchRun

Replace the current `ScrapeRun` hack (where per-profile match runs are logged
with `source: "GREENHOUSE"`) with a dedicated model:

```prisma
model MatchRun {
  id        String   @id @default(cuid())
  profileId String
  createdAt DateTime @default(now())

  candidatesFromSql    Int @default(0)
  acceptedByHeuristic  Int @default(0)
  borderlineToAi       Int @default(0)
  acceptedByAi         Int @default(0)
  rejectedTotal        Int @default(0)
  aiTokensUsed         Int @default(0)
  durationMs           Int?
  errorMessage         String?

  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId, createdAt(sort: Desc)])
  @@map("match_runs")
}
```

Add `matchRuns MatchRun[]` relation to Profile.

## Tier 1: SQL Pre-filter

**File:** `src/lib/match-sql.ts` (extend existing)

The SQL tier's job is to fetch a broad set of plausible candidates quickly. It
should be loose enough to not miss good matches, but smart enough to kill
obvious garbage. Returns only IDs — full pool data is fetched separately by the
orchestrator before passing to Tier 2 (see Data Handoff section).

### Fixes to current logic

**Minimum token length:** Tokens under 3 characters are discarded. This kills
`%ai%`, `%qa%`, `%it%`, and similar. If stripping short tokens leaves no
tokens, fall back to the full phrase as a compound pattern.

**Compound phrase matching:** Before tokenizing, check if the full role string
(lowercased) is a meaningful compound. For multi-word roles, generate both the
compound phrase pattern AND individual token patterns:
- "AI Engineer" → `%ai engineer%` (compound, primary) + `%engineer%` (token, if
  length >= 3)
- "Frontend Developer" → `%frontend developer%` + `%frontend%`

**Short-token fallback (under 3 chars):** For roles that are entirely short
tokens (e.g. "QA"), use PostgreSQL regex matching (`~*`) with word boundaries
instead of ILIKE: `jp.title ~* '\mqa\M'`. This matches "QA" as a whole word
but not "qa" embedded in other words. The regex fallback is only used when all
tokens are under the 3-character threshold.

The compound phrase pattern is the primary match. Token patterns serve as
fallback for title variations ("Engineer, AI" vs "AI Engineer").

**Country eligibility filtering:** If the profile has `workEligibility` set and
the pool entry has a `country`, reject entries where the country is not in the
eligibility list. Pool entries with null country pass through (handled by later
tiers). Remote jobs with a known country are filtered by eligibility.

**Location + eligibility interaction:**
- Profile has `targetLocations: ["Berlin"]` and `workEligibility: ["DE", "US"]`
- Job in Berlin, Germany → passes (location match + eligible)
- Remote job from US company → passes (remote + eligible)
- Remote job from Bangladesh → rejected (not eligible)
- Remote job with unknown country → passes (benefit of doubt, tier 2 checks)

**Soft cap at 500.** The old hard cap of 30 is removed, but a generous soft
cap of `LIMIT 500` prevents degenerate queries (e.g. a profile targeting
"Engineer" with no location constraints). 500 is high enough that legitimate
searches are never truncated, while preventing unbounded memory usage when
loading full pool rows for tier 2.

**Skills in description (SQL-level):** Add an optional SQL check: if
`requiredSkills` are set, prefer candidates where at least one skill appears in
the description text (ILIKE). This is a soft signal, not a hard filter — jobs
without skill mentions still pass if the title matches. The description ILIKE
is implemented as a separate scoring subquery, not as a WHERE clause filter, to
avoid forcing a sequential scan on the description column.

### Updated matching order

1. Exclude: `excludedKeywords` in title (unchanged)
2. Eligibility: `workEligibility` vs `country` on pool entry
3. Location: `targetLocations` match OR remote-eligible (unchanged logic)
4. Role: compound phrase + token matching with min-length threshold
5. Skills: title match OR description mention (soft boost, not hard filter)

### ProfileCriteria type update

The `ProfileCriteria` type in `match-sql.ts` must be extended to include
`workEligibility: string[]`. Since callers already pass full Prisma `Profile`
objects, this is a type-only change — no call-site modifications needed.

## Data Handoff: Tier 1 → Tier 2

Tier 1 returns only IDs (keeping the SQL query lean). The match route
orchestrator then fetches full JobPool rows for all Tier 1 candidate IDs in a
single Prisma query:

```ts
const poolEntries = await prisma.jobPool.findMany({
  where: { id: { in: tier1Ids } },
});
```

This batch fetch provides the `title`, `description`, `skills[]`, `location`,
`country`, `salaryMin`, `salaryMax`, `jobType`, and `companySize` data that
Tier 2 needs for scoring. One query, no N+1 problem.

## Tier 2: Heuristic Scoring

**File:** `src/lib/match-heuristic.ts` (new)

Receives the full JobPool entries from the orchestrator. Runs in-process — no
AI calls, no network. Assigns a confidence score and classifies each candidate
as `ACCEPT`, `REJECT`, or `BORDERLINE`.

### Scoring signals

Each signal contributes to a 0.0–1.0 composite score:

| Signal | Weight | Logic |
|---|---|---|
| Title relevance | 0.35 | Full phrase match > token overlap > partial token |
| Skill overlap | 0.25 | Count of `requiredSkills` found in title + description + `skills[]` |
| Location quality | 0.15 | Exact location match > country match > remote-eligible > unknown |
| Description relevance | 0.15 | Density of role/skill keywords in first 1000 chars of description (skip common boilerplate prefixes like "About us", "Our mission") |
| Metadata signals | 0.10 | Job type match, salary in range, company size match (when available) |

### Classification thresholds

| Score | Classification | Action |
|---|---|---|
| >= 0.6 | `ACCEPT` | Admitted to feed, `matchTier: HEURISTIC` |
| 0.3–0.59 | `BORDERLINE` | Passed to tier 3 for AI triage |
| < 0.3 | `REJECT` | Dropped, not added to feed |

Thresholds are constants in the module, easy to tune. The initial values are
conservative — better to send more to AI triage than to silently drop good
matches.

### Implementation notes

- Score each entry in a loop — pure computation, no I/O
- Return three arrays: accepted (IDs + scores), borderline (IDs + pool data for
  AI prompt construction), rejected (IDs)
- Log counts at each classification level for observability

## Tier 3: AI Triage

**File:** `src/lib/match-ai-triage.ts` (new)

Receives borderline candidates from tier 2 (IDs + pool data). Uses a cheap,
fast model to make a yes/no relevance decision with minimal token usage.

### Model and cost

- Model: `anthropic/claude-haiku-4.5` (same as analyze — fast, cheap)
- Batching: up to 10 jobs per prompt to amortize system prompt overhead
- Per-call estimate: ~2100 input tokens (system prompt ~100 + 10 jobs × ~200
  each), ~200 output tokens (10 decisions × ~20 each)
- At Haiku 4.5 pricing (~$0.80/M input, ~$4/M output): ~$0.002 per batch call,
  ~$0.01-0.03 per profile per run (8-15 calls for a broad search)

### Prompt design

```
You are a job matching filter. Given a candidate's profile and a list of job
listings, decide if each job is a plausible match.

Profile:
- Target roles: {targetRoles}
- Required skills: {requiredSkills}
- Preferred locations: {targetLocations}
- Work eligibility: {workEligibility countries}

For each job, respond with MATCH or REJECT and a brief reason (one sentence).

Respond in JSON format:
{"results": [{"index": 1, "decision": "MATCH", "reason": "..."}, ...]}

Jobs:
1. Title: {title} | Company: {company} | Location: {location}
   Description excerpt: {first 200 chars}

2. ...
```

### Response schema

```ts
const triageResponseSchema = z.object({
  results: z.array(z.object({
    index: z.number(),
    decision: z.enum(["MATCH", "REJECT"]),
    reason: z.string(),
  })),
});
```

If parsing fails for the entire response, default all jobs in that batch to
REJECT. If individual entries are missing from the response, default those to
REJECT. Conservative — better to miss a borderline job than add noise.

Use OpenRouter's JSON mode (`response_format: { type: "json_object" }`) if
available for the selected model, otherwise rely on the prompt instruction.

### Cost controls

- Only borderline jobs reach this tier (typically 10-30% of SQL candidates)
- Batch up to 10 per call to minimize overhead
- AI triage batches for a single profile run in parallel (`Promise.all`) to
  minimize latency. Profiles are processed sequentially to avoid overwhelming
  the API.
- Track token usage on the `Usage` model via `triageCallCount`,
  `triageInputTokens`, `triageOutputTokens`
- The match pipeline resolves the user via `profile.userId` and checks
  `Usage.currentMonthInputTokens` before invoking AI triage. No Clerk auth is
  needed — the cron secret protects the route.
- If the user's monthly token limit is exceeded, skip AI triage and treat all
  borderline candidates as REJECT (conservative degradation)
- Log per-run stats: borderline count, AI calls made, tokens used, match/reject
  ratio

### Classification

| AI response | Action |
|---|---|
| MATCH | Admitted to feed, `matchTier: AI_TRIAGE`, `matchConfidence: 0.5` |
| REJECT | Dropped |
| Parse failure | Dropped (conservative) |

## Location Parser

**File:** `src/lib/location-parser.ts` (new)

Extracts structured `country` and `region` from free-text location strings
during normalization. Called once per pool entry on insert — not at query time.

### Approach

A lookup-based parser, not NLP. Build a mapping of:
- Country names → ISO codes (`"Germany"` → `"DE"`, `"United States"` → `"US"`)
- US state names and abbreviations → region (`"CA"` → `"California"`) + country `"US"`
- Major city → country mappings (`"Berlin"` → `"DE"`, `"London"` → `"GB"`,
  `"San Francisco"` → `"US"`)
- Common patterns: `"Remote (US)"` → country `"US"`, `"Remote - Europe"` →
  region `"Europe"`

All country codes stored as uppercase ISO 3166-1 alpha-2.

### Scrapers with known countries

Some scrapers already know the country without needing the parser:
- **Adzuna:** `country` parameter in API call (lowercase — `.toUpperCase()`)
- **USAJobs:** Always `"US"`

These normalizers should set `country` directly, bypassing the parser. The
parser is for scrapers that only have free-text location strings (Greenhouse,
Ashby, Lever, Arbeitnow).

### Edge cases

- `"Remote"` with no qualifier → country: null, region: null
- `"Berlin, Germany"` → country: "DE", region: "Berlin"
- `"San Francisco, CA"` → country: "US", region: "California"
- `"Remote (US only)"` → country: "US"
- `"Multiple locations"` → country: null
- `"New York, NY or Remote"` → country: "US", region: "New York"
- `"Remote - Europe"` → country: null, region: null (region-level values like
  "Europe" are not useful for eligibility filtering and are treated the same as
  unknown)

### Coverage

Start with ~200 major cities + all countries + US states + German states. This
covers the realistic set for the active scrapers (Greenhouse/Ashby/Lever are
mostly US/EU tech companies, USAJobs is US-only, Adzuna is multi-country with
known country from search config, Arbeitnow is EU-focused).

### Backfill

After deploying the migration, run a one-time backfill that parses `location`
for all existing JobPool entries and populates `country`/`region`. This can be
a dev route or a script.

## Stale Job Detection

When a user changes their search criteria, `rematchProfileSql()` currently
removes stale jobs and adds new matches. The new system updates this:

**Adding new matches:** Use the full three-tier pipeline (SQL → Heuristic → AI
triage) to find and add new matches. Call into the same orchestrator function
used by `/api/match`.

**Removing stale jobs:** Keep SQL-only stale detection, but update
`findStaleJobIds` to use the improved SQL conditions (compound phrases, min
token length, eligibility filtering). This is intentionally asymmetric — removal
uses stricter SQL-only logic, so a job is only removed if it clearly no longer
matches the criteria. A job that would score BORDERLINE in the heuristic tier
stays in the feed rather than being silently removed. This conservative approach
prevents confusing "jobs disappearing" behavior.

## Observability

### Match run logging

Use the new `MatchRun` model (see Schema Changes) to log per-profile match
execution with full tier-by-tier counts. This gives real numbers on each tier's
contribution and lets you tune thresholds with data.

### Usage tracking

Track AI triage cost separately via `triageCallCount`, `triageInputTokens`,
`triageOutputTokens` on the Usage model.

## Onboarding and Settings Integration

### Onboarding

Add a `workEligibility` step to the onboarding wizard. Present it as
"Countries where you're authorized to work" with a multi-select of common
countries (US, UK, Germany, Canada, etc.) plus free-text entry for others.
This is critical for remote job filtering — without it, the new eligibility
system can't function.

### Settings

Add `workEligibility` to the profile settings form (alongside existing
`targetLocations`). Label it distinctly: "Work Authorization" vs "Preferred
Locations" to make the difference clear.

### Rematch

When `workEligibility` or search criteria change, trigger the updated rematch
function (see Stale Job Detection section).

## Migration Path

1. Add schema columns, enum, and MatchRun model (migration)
2. Build location parser + update Adzuna/USAJobs normalizers to set country
   directly
3. Backfill `country`/`region` on existing pool entries
4. Build tier 1 improvements (in existing `match-sql.ts`)
5. Build tier 2 (`match-heuristic.ts`)
6. Build tier 3 (`match-ai-triage.ts`)
7. Build `/api/match` route that orchestrates all three tiers
8. Update `/api/scrape` to fire-and-forget call to `/api/match` after pool layer
9. Update `rematchProfileSql` to use three-tier pipeline for adds, improved SQL
   for stale detection
10. Add `workEligibility` to onboarding and settings UI
11. Add observability logging (MatchRun creation)
12. Backfill existing feeds (optional — new matches will naturally improve)

## Out of Scope

- Changing the AI analysis/scoring step (`/api/analyze`) — that's a separate
  concern and already works well
- Changing the feed UI or sort order — the existing `aiScore`-based sort
  remains primary; `matchConfidence` is stored but not surfaced yet
- Adding new scraper sources
- Salary-based hard filtering (salary data is too sparse across scrapers to be
  reliable as a filter — it's a soft heuristic signal in tier 2)
