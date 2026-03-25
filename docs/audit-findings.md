# Codebase Audit Findings — 2026-03-25

Full audit of the Shortlist codebase across 5 dimensions: security, performance,
data syncing, redundancies, and inconsistencies. **60 findings total.**

This document is designed for agentic execution — each finding includes the exact
files, line references, root cause, and fix instructions. A cleared session can
work through these top-to-bottom.

> **CRITICAL items (1–4) were fixed in PR `fix/critical-security-fixes`.**
> Start from HIGH (#5) onward.

---

## How to Use This Document

1. Read `CLAUDE.md` and `prisma/schema.prisma` first (session start checklist).
2. Work through findings in priority order (HIGH → MEDIUM → LOW).
3. Each finding is one atomic commit. Commit after each fix.
4. Run `pnpm tsc --noEmit` after each change.
5. Group related findings into one branch/PR where noted.

---

## CRITICAL — Fixed in `fix/critical-security-fixes`

### 1. IDOR: Job mutations not scoped to `profileId`

**Status: FIXED**

Five server actions verified `profileId` ownership but mutated jobs using only
`where: { id: jobId }`, allowing any authenticated user to manipulate another
user's jobs.

| Action | File | Fix Applied |
|---|---|---|
| `toggleSaveJob` | `src/app/(dashboard)/dashboard/actions.ts` | Changed to `updateMany` with `{ id: jobId, profileId }` |
| `ignoreJob` | `src/app/(dashboard)/dashboard/actions.ts` | Same |
| `unignoreJob` | `src/app/(dashboard)/dashboard/actions.ts` | Same |
| `updateJobNotes` | `src/app/(dashboard)/dashboard/actions.ts` | Same |
| `createApplication` | `src/app/(dashboard)/pipeline/actions.ts` | Added job ownership check before upsert |

### 2. SSRF via `/api/jobs/extract` URL fetch

**Status: FIXED**

Added `isPrivateHostname()` validation before `fetch()` in
`src/app/api/jobs/extract/route.ts`. Blocks private IPs (10.x, 172.16-31.x,
192.168.x, 169.254.x, 127.x, 0.x), localhost, .local, .internal, and [::1].

### 3. XSS via unsanitized markdown rendering

**Status: FIXED**

Added `rehype-sanitize` plugin to the `Markdown` component in
`src/components/jobs/JobDescription.tsx`. This is the only component that renders
external (scraped) content as markdown.

### 4. `openrouter.ts` missing `server-only` guard

**Status: FIXED**

Added `import "server-only"` as line 1 of `src/lib/openrouter.ts`. Build will
now fail if any client component imports this module.

---

## HIGH — Fix Next

### 5. Over-fetching `jobPool.description` + `rawData` on every dashboard load

**Files:** `src/app/(dashboard)/actions-sync.ts:39-48`

**Problem:** `include: { jobPool: true }` fetches ALL columns including
`description` (5-20KB) and `rawData` (10-50KB) per job. For 200 jobs = 2-10MB
per page load. This data is never displayed on the dashboard.

**Fix:**
1. In `fetchDashboardData()`, replace `include: { jobPool: true }` with:
   ```ts
   include: {
     jobPool: {
       select: {
         id: true, title: true, company: true, location: true,
         locationType: true, url: true, source: true, postedAt: true,
         skills: true, salaryMin: true, salaryMax: true, currency: true,
         jobType: true, country: true,
       },
     },
     application: { select: { status: true } },
   }
   ```
2. Do the same for the applications query's nested `job.jobPool`.
3. In `src/lib/store.ts` `partialize` function (~line 594), also strip
   `description` from persisted jobs (currently only strips `rawData`).
4. Update the `JobWithApplication` type in `src/types/index.ts` if needed
   (may need a `JobPoolSummary` type without `description`/`rawData`).

**Impact:** Biggest single performance win — reduces dashboard data transfer
by 80-90%.

### 6. Optimistic application ID never replaced after `toggleSaveJob`

**Files:** `src/lib/store.ts:230,273-274`

**Problem:** Saving a job creates an optimistic application with
`id: "optimistic-{jobId}"`. The server returns `{ applicationId }` with the
real DB ID, but the store never swaps it in. If the user immediately opens
Pipeline and edits that application, server actions fail.

**Fix:** In the `toggleSaveJob` store action's `.then()` callback (around line
273), after the server action succeeds, update the application's ID:
```ts
// After successful save, replace optimistic ID with real one
if (result.applicationId) {
  set((state) => ({
    applications: state.applications.map((app) =>
      app.id === `optimistic-${jobId}` ? { ...app, id: result.applicationId! } : app
    ),
  }));
}
```

### 7. `updateAppStatus` doesn't mirror server-side `feedStatus: ARCHIVED`

**Files:** `src/lib/store.ts:456-488`, `src/app/(dashboard)/pipeline/actions.ts:27-50`

**Problem:** Server sets `feedStatus: "ARCHIVED"` when status becomes APPLIED,
but the Zustand store only updates the application status. Job still shows in
the feed until next sync.

**Fix:** In the store's `updateAppStatus` function, after setting the application
status, also update the corresponding job's `feedStatus`:
```ts
if (status === "APPLIED") {
  set((state) => ({
    jobs: state.jobs.map((j) =>
      j.id === application.jobId && (j.feedStatus === "NEW" || j.feedStatus === "SAVED")
        ? { ...j, feedStatus: "ARCHIVED" }
        : j
    ),
  }));
}
```

### 8. `tailor/save` route has no revalidation

**File:** `src/app/api/tailor/save/route.ts`

**Problem:** Exporting a resume transitions application to APPLIED and job to
ARCHIVED, but revalidates nothing. Dashboard shows stale state.

**Fix:** Add after the transaction:
```ts
revalidatePath("/dashboard");
revalidatePath("/pipeline");
revalidateTag("dashboard-stats");
```
Import `revalidatePath` and `revalidateTag` from `"next/cache"`.

### 9. Import job doesn't update Zustand store

**File:** `src/components/jobs/ImportJobModal.tsx:249`

**Problem:** Calls `router.refresh()` after import, but dashboard reads from
Zustand. Imported job doesn't appear until background sync.

**Fix:** After successful import, call the store's `sync()` function:
```ts
const { sync } = useDashboardStore.getState();
await sync();
```
Or import and call the `sync` action from the store.

### 10. Usage counter race condition

**Files:** `src/app/api/analyze/route.ts:47-54,189-208`,
`src/app/api/tailor/route.ts:91-100,286-305`,
`src/app/(dashboard)/dashboard/actions.ts:200-203,257-275`

**Problem:** Check-then-increment pattern with no locking. Two concurrent AI
calls can both pass the limit check. Batch analyze writes aggregates only at
end — crash midway = undercounted tokens.

**Fix:**
1. Use atomic increment-and-check in a transaction:
   ```ts
   const usage = await prisma.$transaction(async (tx) => {
     const u = await tx.usage.findUnique({
       where: { userId },
       select: { currentMonthInputTokens: true, monthlyLimitInputTokens: true },
     });
     if (u && u.currentMonthInputTokens >= u.monthlyLimitInputTokens) {
       throw new Error("LIMIT_EXCEEDED");
     }
     return u;
   });
   ```
2. For batch analyze, increment after EACH job instead of aggregating at end.

### 11. CORS accepts any Chrome extension origin

**File:** `src/middleware.ts:21-27`

**Problem:** `origin?.startsWith("chrome-extension://")` allows ANY extension.

**Fix:** Check the full origin against the known extension ID:
```ts
const ALLOWED_EXTENSION = "chrome-extension://YOUR_EXTENSION_ID_HERE";
if (origin !== ALLOWED_EXTENSION) return null;
```

---

## MEDIUM — Redundancies (good branch: `refactor/extract-shared-helpers`)

### 12. Extract `incrementUsage()` helper — 5 copies

**Locations:**
- `src/app/api/analyze/route.ts:190-208`
- `src/app/api/tailor/route.ts:287-305`
- `src/app/api/jobs/extract/route.ts:149-166`
- `src/app/(dashboard)/dashboard/actions.ts:257-275`
- `src/lib/match-ai-triage.ts:224`

**Fix:** Create `src/lib/usage.ts`:
```ts
export async function incrementUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  callType: "analysis" | "tailor" | "extraction",
) { ... }
```
Map `callType` to the correct counter field (`analysisCallCount`,
`tailorCallCount`, etc.). Replace all 5 copies.

### 13. Extract `requireProfile()` helper — 15+ copies

**Pattern repeated in:** `dashboard/actions.ts` (8x), `settings/actions.ts` (7x),
`model-actions.ts`, `feedback-actions.ts`, `pipeline/actions.ts` (4x), API routes.

**Fix:** Create in `src/lib/auth.ts`:
```ts
export async function requireProfile(profileId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");
  return { userId, profile };
}
```
Add overloads with `include` option for cases that need `user.usage`, etc.

### 14. Extract `usePipelineEditing()` hook — ~160 duplicated lines

**Files:**
- `src/components/pipeline/PipelineTable.tsx:56-190`
- `src/components/pipeline/kanban/KanbanBoard.tsx:62-222`

**Problem:** Both contain identical `fieldOverrides` state, `pendingSaves` ref,
`saveTimers` ref, `getFields()`, `handleFieldChange()` with 1500ms debounce,
`terminalOverrides` + `undoState`, `handleStatusChange()`, `handleUndo()`,
`handleUndoDismiss()`.

**Fix:** Extract to `src/components/pipeline/use-pipeline-editing.ts`. Hook
returns `{ getFields, handleFieldChange, handleStatusChange, handleUndo,
handleUndoDismiss, terminalOverrides, undoState }`.

### 15. Unify `TERMINAL_STATUSES` — 3 definitions

**Locations:**
- `src/components/pipeline/shared.tsx:9` (exported Set)
- `src/lib/store-filters.ts:158` (private Set, identical values)
- `src/app/(dashboard)/pipeline/actions.ts:184` (inline array in `notIn`)

**Fix:** Move to a shared non-client constants file (e.g.,
`src/lib/pipeline-constants.ts`). Remove `"use client"` dependency. Import
everywhere. The `ScorePill` component that currently lives in `shared.tsx` can
stay there; only the constants move.

### 16. Extract `checkUsageLimit()` helper — 4 copies

**Locations:** `analyze/route.ts:48-54`, `tailor/route.ts:91-100`,
`jobs/extract/route.ts:86-92`, `dashboard/actions.ts:200-203`

**Fix:** Add to `src/lib/usage.ts`:
```ts
export async function checkUsageLimit(userId: string): Promise<boolean> { ... }
```

### 17. Generalize `parseAiJsonResponse<T>()` — 2 copies

**Files:** `src/lib/ai-analysis.ts:21-35`, `src/app/api/jobs/extract/route.ts:49-63`

**Fix:** Create generic helper:
```ts
export function parseAiJsonResponse<T>(
  text: string,
  validate: (parsed: unknown) => parsed is T,
): T | null { ... }
```

### 18. Deduplicate rematch logic in settings actions

**File:** `src/app/(dashboard)/settings/actions.ts`

`updateSearchCriteria()` (lines 74-90) and `rematchProfile()` (lines 370-386)
share identical stale-ID + match-pipeline + revalidation logic.

**Fix:** Extract shared `rematchAndRevalidate(profileId, profile)` helper
within the same file.

---

## MEDIUM — Inconsistencies (good branch: `fix/consistency-cleanup`)

### 19. `max_tokens` vs `max_completion_tokens`

**`max_completion_tokens`:** `analyze/route.ts:137`, `match-ai-triage.ts:130`
**`max_tokens`:** `tailor/route.ts:262`, `extract/route.ts:138`, `dashboard/actions.ts:231`

**Fix:** Standardize on `max_completion_tokens` (newer OpenAI API). Update the
3 files still using `max_tokens`.

### 20. `NextResponse.json()` vs `Response.json()`

**`NextResponse.json()`:** `check-disabled/route.ts`, `dev/backfill-locations/route.ts`,
`dev/seed/route.ts`

**Fix:** Replace with `Response.json()` to match the rest of the codebase.
Remove unused `NextResponse` imports.

### 21. `process.env.ADMIN_USER_ID` vs `env.ADMIN_USER_ID`

**`process.env`:** `middleware.ts:68`, `(dashboard)/layout.tsx:23`
**`env`:** All admin routes

**Fix:** Middleware can't import the full `env` module (Edge runtime). Leave
middleware as-is. Fix `(dashboard)/layout.tsx` to use `env.ADMIN_USER_ID`.

### 22. `findFirst` vs `findUnique` for PK lookups

**`findFirst({ where: { id } })`:** `tailor/route.ts:42`, `tailor/save/route.ts:23`,
`tailor/[jobId]/page.tsx:9`

**Fix:** Change to `findUnique({ where: { id } })` for single-PK lookups.
Keep `findFirst` where the `where` has a composite filter (e.g., `{ id, profileId }`).

### 23. Missing `statusUpdatedAt` in `createApplication`

**File:** `src/app/(dashboard)/pipeline/actions.ts:122`

`create: { jobId, profileId, status: "INTERESTED" }` — missing `statusUpdatedAt`.
Compare to `toggleSaveJob` which includes `statusUpdatedAt: new Date()`.

**Fix:** Add `statusUpdatedAt: new Date()` to the `create` object.

### 24. `.parse()` vs `.safeParse()` for Zod validation

**`.parse()` (throws):** `src/app/(admin)/actions.ts:22,32,42,52,85`

**Fix:** Change to `.safeParse()` with proper error handling, matching the
pattern used in all other server actions.

### 25. `updateCustomJob` returns `{ error }` while siblings throw

**File:** `src/app/(dashboard)/dashboard/actions.ts:327-371`

**Fix:** Change to throw pattern to match all other actions in the file.
Update the caller in the component to catch errors.

### 26. `analyzeSchema` uses `z.string().min(1)` for `profileId`

**File:** `src/lib/validations.ts:29`

**Fix:** Change to `z.string().cuid()` to match all other schemas.

---

## MEDIUM — Performance (good branch: `perf/query-optimization`)

### 27. Missing `pg_trgm` index on `job_pool.title`

**Problem:** `match-sql.ts` does `LOWER(jp.title) LIKE ANY(...)` with no index.

**Fix:** Create a migration:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_job_pool_title_trgm ON job_pool USING gin (title gin_trgm_ops);
```

### 28. Unindexed text columns in match query

**Problem:** `LOWER(location)` and `LOWER(description)` also scanned without
indexes in `match-sql.ts`.

**Fix:** Add trigram indexes for `location`. `description` is too large for
trigram — consider full-text search index if needed.

### 29. `findStaleJobIds` correlated subquery

**File:** `src/lib/match-sql.ts:229-242`

**Fix:** Replace `NOT IN (SELECT ...)` with `NOT EXISTS (SELECT 1 FROM ...)`.

### 30. Parallelize Adzuna + USAJobs scraper searches

**Files:** `src/lib/scrapers/adzuna.ts:115-139`, `src/lib/scrapers/usajobs.ts:127-156`

**Fix:** Wrap the outer search-config loop in `Promise.allSettled()`. Keep
inner pagination sequential (page count depends on previous response).

### 31. Duplicate `jobPool` data in jobs + applications queries

**File:** `src/app/(dashboard)/actions-sync.ts:39-48`

**Fix:** Applications query should use a narrow `select` on nested
`job.jobPool` — only `title`, `company`, `source` for pipeline display.

### 32. `jobs.indexOf()` in virtualizer loop — O(n^2)

**File:** `src/components/jobs/JobFeed.tsx:363`

**Fix:** Pre-build a `Map<string, number>` from job ID to index before the
loop. Use `jobIndexMap.get(job.id)` instead of `jobs.indexOf(job)`.

### 33. Sequential pool insert chunks

**File:** `src/app/api/scrape/route.ts:147-154`

**Fix:** Use `Promise.all()` for the `createMany` chunks since
`skipDuplicates` makes them idempotent.

---

## MEDIUM — Data Syncing (good branch: `fix/sync-gaps`)

### 34. `batchSaveJobs` doesn't create Application records

**File:** `src/app/(dashboard)/dashboard/actions.ts:152-171`

**Problem:** `batchSaveJobs` only does `updateMany({ feedStatus: "SAVED" })`
but doesn't create `Application` records. Individual `toggleSaveJob` does.

**Fix:** After the `updateMany`, create applications for all batch-saved jobs:
```ts
await prisma.$transaction(
  jobIds.map((id) =>
    prisma.application.upsert({
      where: { jobId: id },
      create: { jobId: id, profileId, status: "INTERESTED", statusUpdatedAt: new Date() },
      update: {},
    })
  )
);
```

### 35. `updateJobNotes` missing `revalidatePath`

**File:** `src/app/(dashboard)/dashboard/actions.ts:374-391`

**Fix:** Add `revalidatePath("/dashboard")` and `revalidatePath(\`/jobs/${jobId}\`)`.

### 36. Scrape/match/analyze pipeline has no effective revalidation

**Files:** `src/app/api/scrape/route.ts`, `src/app/api/match/route.ts`,
`src/app/api/analyze/route.ts`

**Problem:** After cron runs, dashboard stays stale. `revalidateTag("dashboard-stats")`
from match route has no effect because `fetchDashboardData` doesn't use
`unstable_cache` with that tag.

**Fix:** Add `revalidatePath("/dashboard")` to the match route after creating
new jobs, and to the analyze route after scoring.

### 37. `followUpCount` stale after `updateApplicationDetail`

**Files:** `src/lib/store.ts:55`, `src/app/(dashboard)/pipeline/actions.ts:100-104`

**Fix:** After `updateApplicationDetail` changes `followUpAt`, the store should
re-fetch the follow-up count. Either trigger a targeted sync or fetch the count
server-side and return it from the action.

### 38. `pendingMatchCount` not adjusted for stale-job removal

**File:** `src/lib/match-pipeline.ts:147-151`

**Fix:** Subtract the stale-job count from `pendingMatchCount` calculation.

### 39. Profile switch race with in-flight optimistic mutations

**File:** `src/components/dashboard/ProfileSwitcher.tsx:45-51`, `src/lib/store.ts:162-175`

**Fix:** Cancel pending retry timers and abort in-flight mutations when
`switchProfile()` is called. Add a profile-switch generation counter; ignore
callbacks from stale generations.

---

## MEDIUM — Security

### 40. `shortlist-onboarded` cookie client-settable, no `HttpOnly`

**File:** `src/components/onboarding/OnboardingWizard.tsx:200`

**Fix:** Set the cookie from the server action that completes onboarding
instead of from client JS. Use `HttpOnly`, `Secure`, `SameSite=Lax`.

### 41. `shortlist-active` cookie controls disabled-user debounce

**File:** `src/middleware.ts:77-95`

**Fix:** Set from middleware response (already `HttpOnly`). Or switch to a
shorter TTL (1 minute instead of 5).

### 42. In-memory rate limiter resets on cold starts

**File:** `src/lib/rate-limit.ts`

**Fix:** Replace with Upstash Redis-based rate limiter (`@upstash/ratelimit`)
for production. Keep in-memory for local dev.

### 43. `/api/analyze` + `/api/match` don't verify profile ownership

**Files:** `src/app/api/analyze/route.ts:39-43`, `src/app/api/match/route.ts:23-29`

**Fix:** Add `profile.userId` verification when `profileId` is provided.
These are behind `CRON_SECRET` but defense-in-depth matters.

---

## LOW — Opportunistic Cleanup

### 44. Dead export: `rematchProfileSql` in `match-sql.ts`
Remove the function — it's never imported.

### 45. `URL_RE` duplicated in 3 files
Move to `src/lib/validations.ts` or a shared constants file.

### 46. `TurndownService` duplicated with identical config
Create `src/lib/html-to-markdown.ts` with shared instance.

### 47. AI context logging duplicated in 3 routes
Extract `logAiContext(host, label, system, user)` helper.

### 48. Score color threshold logic duplicated
Extract `getScoreColor(score)` and `getScoreLabel(score)` to shared util.

### 49. Unused `ScraperSource` enum values
Remove LINKEDIN, INDEED, BERLIN_STARTUP_JOBS, HONEYPOT, YC_JOBS, NO_FLUFF_JOBS
from schema if they're not planned for implementation.

### 50. Page props: `Props` vs `PageProps`
Standardize on `PageProps` in `tailor/[jobId]/page.tsx`.

### 51. Missing `Metadata` type on admin users page
Add `: Metadata` annotation.

### 52. Missing metadata exports on 4 pages
Add `export const metadata: Metadata = { title: "..." }` to:
- `(admin)/admin/page.tsx`
- `(admin)/admin/feedback/page.tsx`
- `(admin)/admin/users/[userId]/page.tsx`
- `disabled/page.tsx`

### 53. Clerk webhook `user.deleted` swallows errors
Replace `.catch(() => {})` with proper error logging/retry.

### 54. Feed pagination duplicates when sorting by score during analysis
Document as known limitation or switch to stable sort key.

### 55. No DB constraint on application status transitions
Add a check constraint or application-level validation for valid transitions.

### 56. Cross-tab mutations invisible until focus + 30s
Add `BroadcastChannel` or `storage` event listener for cross-tab sync.

### 57. `getActiveProfile` over-fetches
Add `select` for routes that only need `id` and basic fields.

### 58. Sequential `ScrapeRun` logging
Batch or parallelize `ScrapeRun` creates.

### 59. `appendFileSync` host check can be spoofed
Tighten `isLocalhost` check: `host === "localhost:3000" || host === "127.0.0.1:3000"`.

### 60. `/api/dev/seed` in public routes list
Remove from `isPublicRoute` matcher or add `NODE_ENV` guard in middleware.
