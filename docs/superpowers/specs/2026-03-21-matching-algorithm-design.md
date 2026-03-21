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

Each tier is a filter: it receives candidates from the previous tier and either
accepts, rejects, or (in tier 2's case) flags as borderline for AI triage.

### Pipeline separation

The match step decouples from the scrape cron. The pipeline becomes:

| Step | Trigger | Route | Purpose |
|---|---|---|---|
| Scrape | Cron (7am UTC) | `POST /api/scrape` | Populate pool only |
| Match | Called by scrape after pool is populated, or standalone | `POST /api/match` | Three-tier matching for all enabled profiles |
| Analyze | Separate cron | `POST /api/analyze` | AI scoring of matched but unanalyzed jobs |

`/api/scrape` calls `/api/match` internally after the pool layer completes (or
the match route can be triggered independently via `?standalone=1`). This keeps
the existing single-cron schedule while giving match its own time budget and
making it independently callable (useful for rematch-on-criteria-change).

Both `/api/scrape` and `/api/match` are protected by `CRON_SECRET`.

## Schema Changes

### JobPool — new columns

```prisma
model JobPool {
  // ... existing fields ...
  country     String?   // ISO 3166-1 alpha-2 (e.g. "US", "DE", "GB")
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

### Job — new columns

```prisma
model Job {
  // ... existing fields ...
  matchTier       MatchTier?   // Which pipeline tier admitted this job
  matchConfidence Float?       // 0.0–1.0 confidence from admitting tier
}
```

### Profile — new columns

```prisma
model Profile {
  // ... existing fields ...
  workEligibility String[]  // ISO 3166-1 alpha-2 codes ["US", "DE"]
}
```

Separates "where I can legally work" from `targetLocations` ("where I want to
work"). Populated during onboarding and editable in settings.

### New enum

```prisma
enum MatchTier {
  SQL
  HEURISTIC
  AI_TRIAGE
}
```

## Tier 1: SQL Pre-filter

**File:** `src/lib/match-sql.ts` (extend existing)

The SQL tier's job is to fetch a broad set of plausible candidates quickly. It
should be loose enough to not miss good matches, but smart enough to kill
obvious garbage.

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
- "QA" → `%qa%` is under threshold, fall back to `%qa engineer%` or `%qa %` with
  word boundary approximation

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

**Remove the 30-job cap.** The cap was a safeguard for the old system where
every matched job immediately entered the feed. With three tiers, the later
tiers handle volume control. If SQL returns 200 candidates, that's fine — most
will be filtered by tier 2.

**Skills in description (SQL-level):** Add an optional SQL check: if
`requiredSkills` are set, prefer candidates where at least one skill appears in
the description text (ILIKE). This is a soft signal, not a hard filter — jobs
without skill mentions still pass if the title matches.

### Updated matching order

1. Exclude: `excludedKeywords` in title (unchanged)
2. Eligibility: `workEligibility` vs `country` on pool entry
3. Location: `targetLocations` match OR remote-eligible (unchanged logic)
4. Role: compound phrase + token matching with min-length threshold
5. Skills: title match OR description mention (soft boost, not hard filter)

## Tier 2: Heuristic Scoring

**File:** `src/lib/match-heuristic.ts` (new)

Receives the candidate set from tier 1 (pool entry IDs with their JobPool data).
Runs in-process — no AI calls, no network. Assigns a confidence score and
classifies each candidate as `ACCEPT`, `REJECT`, or `BORDERLINE`.

### Scoring signals

Each signal contributes to a 0.0–1.0 composite score:

| Signal | Weight | Logic |
|---|---|---|
| Title relevance | 0.35 | Full phrase match > token overlap > partial token |
| Skill overlap | 0.25 | Count of `requiredSkills` found in title + description + `skills[]` |
| Location quality | 0.15 | Exact location match > country match > remote-eligible > unknown |
| Description relevance | 0.15 | Density of role/skill keywords in first 500 chars of description |
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

- Query pool entries in a single batch (IDs from tier 1)
- Score each in a loop — pure computation, no I/O
- Return three arrays: accepted IDs + scores, borderline IDs + pool data, rejected IDs
- Log counts at each classification level for observability

## Tier 3: AI Triage

**File:** `src/lib/match-ai-triage.ts` (new)

Receives borderline candidates from tier 2. Uses a cheap, fast model to make a
yes/no relevance decision with minimal token usage.

### Model and cost

- Model: `anthropic/claude-haiku-4.5` (same as analyze — fast, cheap)
- Input: ~200 tokens per job (profile summary + job title + first 200 chars of
  description)
- Output: ~20 tokens (yes/no + one-sentence reason)
- Batching: up to 10 jobs per prompt to amortize system prompt overhead

### Prompt design

```
You are a job matching filter. Given a candidate's profile and a list of job
listings, decide if each job is a plausible match.

Profile:
- Target roles: {targetRoles}
- Required skills: {requiredSkills}
- Locations: {targetLocations}
- Work eligibility: {workEligibility countries}

For each job, respond with MATCH or REJECT and a brief reason (one sentence).

Jobs:
1. Title: {title} | Company: {company} | Location: {location}
   Description excerpt: {first 200 chars}

2. ...
```

### Response parsing

Expect structured output. Use Zod schema validation on the response. If parsing
fails for a job, default to REJECT (conservative — better to miss a borderline
job than add noise).

### Cost controls

- Only borderline jobs reach this tier (typically 10-30% of SQL candidates)
- Batch up to 10 per call to minimize overhead
- Track token usage on the `Usage` model (new field: `triageCallCount`)
- If the user's monthly token limit is exceeded, skip AI triage and treat all
  borderline candidates as REJECT (conservative degradation)
- Log per-run stats: borderline count, AI calls made, tokens used, match/reject
  ratio

### Classification

| AI response | Action |
|---|---|
| MATCH | Admitted to feed, `matchTier: AI_TRIAGE`, confidence from AI |
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

### Edge cases

- `"Remote"` with no qualifier → country: null, region: null
- `"Berlin, Germany"` → country: "DE", region: "Berlin"
- `"San Francisco, CA"` → country: "US", region: "California"
- `"Remote (US only)"` → country: "US"
- `"Multiple locations"` → country: null
- `"New York, NY or Remote"` → country: "US", region: "New York"

### Coverage

Start with ~200 major cities + all countries + US states + German states. This
covers the realistic set for the active scrapers (Greenhouse/Ashby/Lever are
mostly US/EU tech companies, USAJobs is US-only, Adzuna is multi-country with
known country from search config, Arbeitnow is EU-focused).

Adzuna is special: the scraper already knows the country from the search
configuration (`country` parameter in API call). Pass this through to
normalization so the parser has a strong hint.

### Backfill

After deploying the migration, run a one-time backfill that parses `location`
for all existing JobPool entries and populates `country`/`region`. This can be
a dev route or a script.

## Observability

### Match run logging

Extend `ScrapeRun` or create a new `MatchRun` model to log per-profile match
execution:

```
- candidatesFromSql: number
- acceptedByHeuristic: number
- borderlineToAi: number
- acceptedByAi: number
- rejectedTotal: number
- aiTokensUsed: number
- durationMs: number
```

This gives you real numbers on each tier's contribution and lets you tune
thresholds with data.

### Usage tracking

Add `triageCallCount` and `triageTokens` to the `Usage` model to track AI
triage cost separately from analysis/tailor costs.

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

When `workEligibility` changes, trigger `rematchProfileSql()` (already exists)
to re-evaluate the feed. The rematch function needs to be updated to use the
new three-tier pipeline instead of just SQL matching.

## Migration Path

1. Add schema columns and enum (migration)
2. Build location parser
3. Backfill `country`/`region` on existing pool entries
4. Build tier 1 improvements (in existing `match-sql.ts`)
5. Build tier 2 (`match-heuristic.ts`)
6. Build tier 3 (`match-ai-triage.ts`)
7. Build `/api/match` route that orchestrates all three tiers
8. Update `/api/scrape` to call `/api/match` after pool layer
9. Update `rematchProfileSql` to use three-tier pipeline
10. Add `workEligibility` to onboarding and settings UI
11. Add observability logging
12. Backfill existing feeds (optional — new matches will naturally improve)

## Out of Scope

- Changing the AI analysis/scoring step (`/api/analyze`) — that's a separate
  concern and already works well
- Changing the feed UI or sort order — the existing `aiScore`-based sort
  remains primary; `matchConfidence` is stored but not surfaced yet
- Adding new scraper sources
- Salary-based hard filtering (salary data is too sparse across scrapers to be
  reliable as a filter — it's a soft heuristic signal in tier 2)
