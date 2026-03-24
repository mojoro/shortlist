# Admin Pool Source Coverage & System Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make USAJobs and Adzuna always visible in the Pool page, and surface `jobsInPool`, `durationMs`, and `errorMessage` in the System Health page alongside a 30-run history section.

**Architecture:** Two server-side changes — a merge step in `getAdminPoolStats()` so all 7 `ScraperSource` values always appear, and enhanced rendering in `system/page.tsx` that exposes already-fetched-but-unused `ScrapeRun` fields plus a new history section.

**Tech Stack:** Next.js 15 App Router (server components), TypeScript, Prisma, pnpm, Vitest (unit tests)

---

## File Map

| File | Change |
|---|---|
| `src/lib/admin-queries.ts` | Add source-list merge to `getAdminPoolStats()` |
| `src/app/(admin)/admin/system/page.tsx` | Add In Pool + Duration columns, error sub-rows, Run History section |
| `tests/unit/admin-queries.test.ts` | New: unit tests for the merge logic |

---

## Task 1: Always show all sources in Pool stats

**Files:**
- Modify: `src/lib/admin-queries.ts`
- Create: `tests/unit/admin-queries.test.ts`

### Background

`getAdminPoolStats()` uses `prisma.jobPool.groupBy({ by: ["source"], _count: true })`. When a source has zero entries (e.g. USAJOBS, ADZUNA after failures), it is absent from the result. The pool page and `SourceFilter` render whatever this list contains — so zero-count sources are invisible.

The fix: after the query, merge the result against all 7 known `ScraperSource` values. Sources missing from DB get `_count: 0`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/admin-queries.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// We only test the merge logic — not the DB query itself.
// Extract a pure helper so we can test it without Prisma.
import { mergeSourceCounts } from "@/lib/admin-queries";
import { ScraperSource } from "@prisma/client";

describe("mergeSourceCounts", () => {
  it("returns all ScraperSource values even when some are missing from DB results", () => {
    const dbResult = [
      { source: ScraperSource.GREENHOUSE, _count: 100 },
      { source: ScraperSource.ARBEITNOW, _count: 44 },
    ];

    const result = mergeSourceCounts(dbResult);

    const sources = result.map((r) => r.source);
    expect(sources).toContain(ScraperSource.USAJOBS);
    expect(sources).toContain(ScraperSource.ADZUNA);
    expect(sources).toContain(ScraperSource.ASHBY);
    expect(sources).toContain(ScraperSource.LEVER);
    expect(sources).toContain(ScraperSource.CUSTOM);
    expect(result).toHaveLength(7);
  });

  it("preserves counts from DB for sources that have entries", () => {
    const dbResult = [
      { source: ScraperSource.GREENHOUSE, _count: 6881 },
    ];

    const result = mergeSourceCounts(dbResult);

    const gh = result.find((r) => r.source === ScraperSource.GREENHOUSE);
    expect(gh?._count).toBe(6881);
  });

  it("sets _count to 0 for sources absent from DB result", () => {
    const dbResult: { source: ScraperSource; _count: number }[] = [];

    const result = mergeSourceCounts(dbResult);

    for (const r of result) {
      expect(r._count).toBe(0);
    }
  });

  it("returns sources in the canonical display order", () => {
    const result = mergeSourceCounts([]);
    const sources = result.map((r) => r.source);
    expect(sources).toEqual([
      ScraperSource.GREENHOUSE,
      ScraperSource.ASHBY,
      ScraperSource.LEVER,
      ScraperSource.USAJOBS,
      ScraperSource.ADZUNA,
      ScraperSource.ARBEITNOW,
      ScraperSource.CUSTOM,
    ]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test:unit tests/unit/admin-queries.test.ts
```

Expected: FAIL — `mergeSourceCounts` is not exported from `@/lib/admin-queries`.

- [ ] **Step 3: Implement `mergeSourceCounts` and wire it into `getAdminPoolStats()`**

In `src/lib/admin-queries.ts`, add the helper and update the function:

```typescript
import { ScraperSource } from "@prisma/client";

// Canonical display order for all sources
const ALL_SOURCES: ScraperSource[] = [
  ScraperSource.GREENHOUSE,
  ScraperSource.ASHBY,
  ScraperSource.LEVER,
  ScraperSource.USAJOBS,
  ScraperSource.ADZUNA,
  ScraperSource.ARBEITNOW,
  ScraperSource.CUSTOM,
];

export function mergeSourceCounts(
  dbResult: { source: ScraperSource; _count: number }[]
): { source: ScraperSource; _count: number }[] {
  const bySource = new Map(dbResult.map((r) => [r.source, r._count]));
  return ALL_SOURCES.map((source) => ({
    source,
    _count: bySource.get(source) ?? 0,
  }));
}
```

Then update `getAdminPoolStats()` to call `mergeSourceCounts` on the `bySource` result:

```typescript
export async function getAdminPoolStats() {
  const [total, rawBySource] = await Promise.all([
    prisma.jobPool.count(),
    prisma.jobPool.groupBy({
      by: ["source"],
      _count: true,
      orderBy: { _count: { source: "desc" } },
    }),
  ]);

  // Map Prisma's groupBy shape { _count: { source: N } } to { _count: N }
  // Note: Prisma groupBy returns _count as an object when using _count: true
  // The actual count is at rawBySource[i]._count (a number, not an object)
  const bySource = mergeSourceCounts(
    rawBySource.map((r) => ({ source: r.source, _count: r._count }))
  );

  return { total, bySource };
}
```

> **Note:** Verify Prisma's exact `_count` shape for `groupBy` at runtime — it may be `r._count` (a number) or `r._count.source` (an object). Check `src/app/(admin)/admin/pool/page.tsx` line 51 (`s._count.toLocaleString()`) — that call treats `_count` as a number, confirming it is already a plain number. The mapping above is correct.

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
pnpm test:unit tests/unit/admin-queries.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 5: Run typecheck**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin-queries.ts tests/unit/admin-queries.test.ts
git commit -m "Always show all ScraperSource values in pool stats with zero floor"
```

---

## Task 2: Enhance scraper status table on System Health page

**Files:**
- Modify: `src/app/(admin)/admin/system/page.tsx`

### Background

The current system page table has 4 columns: Source, Last Run, Status, Jobs Found. The `ScrapeRun` rows returned by `getSystemHealth()` already include `jobsInPool`, `durationMs`, and `errorMessage` — they just aren't rendered. Add 2 new columns and inline error sub-rows.

The error sub-row fires when `status === "FAILED"` or `status === "PARTIAL"` and `errorMessage` is non-null.

- [ ] **Step 1: Add the `formatDuration` helper to `system/page.tsx`**

Add this function near the top of the file alongside the existing `formatSource` and `formatTokens` helpers:

```typescript
function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}
```

- [ ] **Step 2: Update the table header to 6 columns**

Find the `<thead>` block in the Scraper Status table. Replace it with:

```tsx
<thead>
  <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
    <th className="px-4 py-3">Source</th>
    <th className="px-4 py-3">Last Run</th>
    <th className="px-4 py-3">Status</th>
    <th className="px-4 py-3 text-right">Jobs Found</th>
    <th className="px-4 py-3 text-right">In Pool</th>
    <th className="px-4 py-3 text-right">Duration</th>
  </tr>
</thead>
```

- [ ] **Step 3: Update the table body rows**

Replace the existing row render with the new row + optional error sub-row:

```tsx
<tbody className="divide-y divide-[var(--border)]">
  {health.scraperStatus.map((run) => (
    <>
      <tr
        key={run.id}
        className="text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]"
      >
        <td className="px-4 py-3 font-medium">
          {formatSource(run.source)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-muted)]">
          {formatDistanceToNow(run.createdAt, { addSuffix: true })}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={run.status} />
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {run.jobsFound}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {run.jobsInPool}
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-[var(--text-muted)]">
          {formatDuration(run.durationMs)}
        </td>
      </tr>
      {(run.status === "FAILED" || run.status === "PARTIAL") &&
        run.errorMessage && (
          <tr key={`${run.id}-error`} className="bg-[var(--bg-subtle)]">
            <td
              colSpan={6}
              className="px-4 py-2 text-xs text-[var(--text-muted)]"
            >
              {run.errorMessage}
            </td>
          </tr>
        )}
    </>
  ))}
  {health.scraperStatus.length === 0 && (
    <tr>
      <td
        colSpan={6}
        className="px-4 py-8 text-center text-[var(--text-muted)]"
      >
        No scrape runs recorded yet.
      </td>
    </tr>
  )}
</tbody>
```

> **Note on React fragments in map:** Using `<>...</>` inside `.map()` requires a `key` on the fragment. Use `<React.Fragment key={run.id}>` instead of the shorthand `<>`:

```tsx
{health.scraperStatus.map((run) => (
  <React.Fragment key={run.id}>
    <tr className="text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]">
      {/* ... row cells ... */}
    </tr>
    {(run.status === "FAILED" || run.status === "PARTIAL") &&
      run.errorMessage && (
        <tr className="bg-[var(--bg-subtle)]">
          <td colSpan={6} className="px-4 py-2 text-xs text-[var(--text-muted)]">
            {run.errorMessage}
          </td>
        </tr>
      )}
  </React.Fragment>
))}
```

Make sure `React` is imported: `import React from "react";` or use the named `Fragment` import.

- [ ] **Step 4: Run typecheck**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/admin/system/page.tsx"
git commit -m "Add In Pool, Duration columns and inline error rows to scraper status table"
```

---

## Task 3: Add Run History section to System Health page

**Files:**
- Modify: `src/app/(admin)/admin/system/page.tsx`

### Background

`getRecentScrapeRuns(limit)` already exists in `admin-queries.ts`. Fetch it in parallel with `getSystemHealth()` and render a new 4th section at the bottom of the page. The table uses the same 6-column structure and error sub-row logic as the enhanced status table.

- [ ] **Step 1: Update the page data fetch**

Find the existing `const health = await getSystemHealth();` call at the top of `AdminSystemPage`. Replace it with a parallel fetch, and add `getRecentScrapeRuns` to the import:

```typescript
import { getSystemHealth, getRecentScrapeRuns } from "@/lib/admin-queries";

// Inside the component:
const [health, recentRuns] = await Promise.all([
  getSystemHealth(),
  getRecentScrapeRuns(30),
]);
```

- [ ] **Step 2: Add the Run History section**

After the closing `</section>` tag of the "AI Token Spend" section, append:

```tsx
{/* Run History */}
<section className="space-y-3">
  <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
    Run History
  </h2>
  <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          <th className="px-4 py-3">Source</th>
          <th className="px-4 py-3">Time</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3 text-right">Jobs Found</th>
          <th className="px-4 py-3 text-right">In Pool</th>
          <th className="px-4 py-3 text-right">Duration</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {recentRuns.map((run) => (
          <React.Fragment key={run.id}>
            <tr className="text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]">
              <td className="px-4 py-3 font-medium">
                {formatSource(run.source)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-[var(--text-muted)]">
                {formatDistanceToNow(run.createdAt, { addSuffix: true })}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={run.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {run.jobsFound}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {run.jobsInPool}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--text-muted)]">
                {formatDuration(run.durationMs)}
              </td>
            </tr>
            {(run.status === "FAILED" || run.status === "PARTIAL") &&
              run.errorMessage && (
                <tr className="bg-[var(--bg-subtle)]">
                  <td
                    colSpan={6}
                    className="px-4 py-2 text-xs text-[var(--text-muted)]"
                  >
                    {run.errorMessage}
                  </td>
                </tr>
              )}
          </React.Fragment>
        ))}
        {recentRuns.length === 0 && (
          <tr>
            <td
              colSpan={6}
              className="px-4 py-8 text-center text-[var(--text-muted)]"
            >
              No scrape runs recorded yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</section>
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/admin/system/page.tsx"
git commit -m "Add Run History section showing last 30 scrape runs with error details"
```

---

## Task 4: Final verification

- [ ] **Step 1: Run full unit test suite**

```bash
pnpm test:unit
```

Expected: All tests pass, including the new `admin-queries.test.ts`.

- [ ] **Step 2: Run typecheck one final time**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Manual smoke-check**

Start the dev server and verify:

1. `/admin/pool` — stat cards show all 7 sources (including USAJobs and Adzuna at 0); filter pills show all 7 sources.
2. `/admin/system` — Scraper Status table has 6 columns; FAILED/PARTIAL rows with error messages show an error sub-row; duration shows for completed runs.
3. `/admin/system` — Run History section appears below AI Token Spend; shows up to 30 rows with full detail.
