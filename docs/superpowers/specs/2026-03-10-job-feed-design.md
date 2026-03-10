# Job Feed Design

## Context

First real feature after scaffolding. Displays AI-scored job listings for the authenticated user's active profile, read from the Neon database (seeded mock data). No detail view in this iteration — feed only.

## What we're building

- `/dashboard` page — job feed, Server Component, reads from DB
- `JobCard` — vertical card showing title, company, location, AI summary, score badge, skill chips, salary, date
- `ScoreBadge` — coloured badge with number + human label (Strong match / Good match / Weak match)
- `FilterChips` — client component, four chips: All · New · Saved · Applied; uses URL search params
- Sort: `aiScore DESC` always on

## Card layout (approved in brainstorm)

Vertical card (option B):
- Top row: company logo (Clearbit) + job title + company/location · score badge top-right
- Middle: 1–2 sentence AI summary (`aiSummary`)
- Bottom row: salary chip · job type chip · skill chips (first 3–4) · date + source flush right

Score badge colours:
- 90+ → green (`#dcfce7` / `#16a34a`) — "Strong match"
- 75–89 → amber (`#fef9c3` / `#a16207`) — "Good match"
- <75 → grey (`#f4f4f5` / `#71717a`) — "Weak match"
- `null` (not yet scored) → grey, no number, label "Not yet scored"

## Filter chip semantics

| Chip | DB condition |
|------|-------------|
| All | No additional filter (excludes HIDDEN) |
| New | `feedStatus = 'NEW'` |
| Saved | `feedStatus = 'SAVED'` |
| Applied | `application.status != 'INTERESTED'` (job has an Application that moved past pipeline entry) |

Filter state lives in URL search params (`?filter=new`). Default: `all`.

## Data fetching

**Page is a Server Component.** Auth via `auth()` from `@clerk/nextjs/server`. If no userId, redirect to `/sign-in`.

Profile resolution: query `Profile` where `userId = clerkId` ordered by `isActive DESC`, take first. If no profile, show empty state ("Set up a profile to see your matches").

Job query (Prisma):
```
Job.findMany({
  where: { profileId, feedStatus: { not: 'HIDDEN' }, ...filterCondition },
  include: { application: { select: { status: true } } },
  orderBy: { aiScore: 'desc' },
  take: 25,
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
})
```

Applied filter condition:
```
{ application: { status: { not: 'INTERESTED' } } }
```

## Pagination

Cursor-based, 25 per page. "Load more" button at bottom. Next cursor = last job's `id` when `jobs.length === 25`.

Since "Load more" needs client state (cursor), the feed cards are a Server Component but the Load More interaction requires a Client Component wrapper or a server action. Use a simple approach: `FilterChips` is already a Client Component — pass the cursor through URL params too (`?cursor=xxx`) and the page re-renders server-side. No client state needed.

## File structure

```
src/
  app/
    (dashboard)/
      layout.tsx                  # Shared dashboard shell (no "use client")
      dashboard/
        page.tsx                  # Feed page — Server Component
        loading.tsx               # Suspense fallback
  components/
    jobs/
      JobCard.tsx                 # Server Component
      ScoreBadge.tsx              # Server Component (pure display)
    ui/
      FilterChips.tsx             # "use client" — reads/writes URL search params
```

## Auth handling

Use `auth()` at the top of `page.tsx`. For this iteration — no middleware yet — handle auth inline:
```ts
const { userId } = await auth();
if (!userId) redirect('/sign-in');
```

## Company logos

`https://logo.clearbit.com/{domain}` extracted from `job.url`. Wrap in Next.js `<Image>` with `onError` fallback to a building icon SVG. Already in `next.config.ts` remote patterns.

## Empty states

- No profile: "You haven't set up a profile yet. Head to Settings to get started."
- Profile exists, no jobs: "No jobs found yet. We'll find matches for you soon."
- Filter returns nothing: "No [new/saved/applied] jobs right now."

## Verification

1. `npm run dev` — navigate to `/dashboard`
2. Jobs appear sorted by score (highest first)
3. Score badges show correct colour + label for each tier
4. Filter chips update the URL and filter correctly
5. "Load more" loads the next 25
6. `npx tsc --noEmit` exits clean
