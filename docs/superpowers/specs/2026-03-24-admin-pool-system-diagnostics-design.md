# Admin Dashboard — Pool Source Coverage & System Diagnostics

**Date:** 2026-03-24
**Branch:** feature/admin-dashboard
**Status:** Approved

---

## Problem

Two gaps in the admin dashboard make scraper failures hard to diagnose:

1. **Pool page** — USAJobs and Adzuna are invisible when they have zero entries (the `groupBy` query only returns sources with data). An admin cannot tell whether these scrapers simply haven't run or have been failing.

2. **System page** — The scraper status table shows `jobsFound` and a status badge, but omits `jobsInPool`, `durationMs`, and `errorMessage`. When a scraper reports 2515 jobs found but status FAILED, there is no way to understand why without inspecting deployment logs. There is also no run history — only the latest run per source is visible.

---

## Scope

Three targeted changes, no schema migrations, no new dependencies.

---

## Existing structure (relevant facts)

- `ScraperSource` enum in `prisma/schema.prisma` has exactly **7** values: `GREENHOUSE`, `ASHBY`, `LEVER`, `USAJOBS`, `ADZUNA`, `ARBEITNOW`, `CUSTOM`.
- `ScrapeRun` fields relevant here: `source`, `status` (SUCCESS/PARTIAL/FAILED), `jobsFound`, `jobsInPool`, `durationMs` (Int?), `errorMessage` (String?), `createdAt`.
- `getSystemHealth()` in `src/lib/admin-queries.ts` calls `prisma.scrapeRun.findMany({ where: { profileId: null }, distinct: ["source"] })` with no `select` clause — returns full rows.
- `getRecentScrapeRuns(limit = 20)` in `src/lib/admin-queries.ts` calls `prisma.scrapeRun.findMany({ where: { profileId: null }, orderBy: { createdAt: "desc" }, take: limit })` — also returns full rows.
- `src/app/(admin)/admin/system/page.tsx` is a single server component with no extracted client islands. Its current scraper status table has **4 columns**: Source, Last Run, Status, Jobs Found.
- `src/app/(admin)/admin/system/page.tsx` already has three `<section>` blocks: Scraper Status, Failed Runs (24h), AI Token Spend.

---

## Change 1 — Pool: Always show all sources

### How

In `getAdminPoolStats()` (`src/lib/admin-queries.ts`), after the `groupBy` result arrives, merge against the full ordered list of all 7 `ScraperSource` values. Any source absent from the DB result gets `_count: 0`. The returned `bySource` array always contains all 7 entries in a predictable order.

`CUSTOM` (manually imported jobs) is included — it's already visible in the current UI when non-zero and should remain visible at zero for consistency.

The pool page passes `stats.bySource.map(s => s.source)` to `SourceFilter` and renders a stat card per entry — both already handle whatever list they receive. Zero-count sources appear as stat cards (value "0") and filter pills (filtering to 0 results). **No changes to `pool/page.tsx` or `SourceFilter.tsx`.**

---

## Change 2 — System: Enhance the scraper status table

### What

Add 2 new columns and inline error display to the existing scraper status table. The table goes from 4 to **6 columns**: Source, Last Run, Status, Jobs Found, **In Pool**, **Duration**.

### New columns

| Column | Source field | Format |
|---|---|---|
| In Pool | `entry.jobsInPool` | Plain number |
| Duration | `entry.durationMs` | `"1.2s"` (≥1000ms) / `"34ms"` (<1000ms) / `"—"` (null) |

### Error sub-row

After each data `<tr>`, if `entry.status === "FAILED"` and `entry.errorMessage` is non-null: render an additional `<tr>` containing a single `<td colSpan={6}>` with the error message in small muted text. Render nothing when `errorMessage` is null.

**No changes to `getSystemHealth()` — it already returns all needed fields.**

---

## Change 3 — System: Recent Runs history section

### What

A new fourth `<section>` appended after the existing "AI Token Spend" section in `system/page.tsx`, titled "Run History". Shows the 30 most recent global scrape runs across all sources.

### How

On the page, call `getRecentScrapeRuns(30)` in parallel with `getSystemHealth()`:

```ts
const [health, recentRuns] = await Promise.all([
  getSystemHealth(),
  getRecentScrapeRuns(30),
]);
```

`getRecentScrapeRuns` already exists and returns full `ScrapeRun` rows — no changes to the function needed.

Render a table with the same 6-column structure as the enhanced status table (Source, Last Run, Status, Jobs Found, In Pool, Duration) and the same error sub-row treatment for FAILED rows with non-null `errorMessage` (colSpan={6}). The table markup is duplicated inline in the same page file — no shared component needed at this scale.

No pagination. The existing "Failed Runs (24h)" section remains in place as the third section, immediately before this new fourth section.

---

## Files Touched

| File | Change |
|---|---|
| `src/lib/admin-queries.ts` | Add source-list merge to `getAdminPoolStats()` |
| `src/app/(admin)/admin/system/page.tsx` | Add In Pool + Duration columns and error sub-rows to status table; add Run History section |

---

## Out of Scope

- Pagination on the run history table
- Click-to-expand error rows (always-visible inline is sufficient)
- Vercel deployment log integration
- Any schema changes
- Shared table component between the two system tables
