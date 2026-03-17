# Hero Demo Preview — Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Add an animated product-tour preview to the landing page hero section. The preview occupies the right column of a new two-column hero layout and plays a looping ~14s story: job feed populating → cursor clicking Tailor → resume generating → pipeline filling. The goal is to show a real user completing the core workflow, not abstract UI skeletons.

---

## Dependency

Add `framer-motion` to the project (`pnpm add framer-motion`). No other new packages.

---

## Hero Layout Change

`SignedOutHero` currently renders `max-w-2xl` copy with no right-side content. Restructure into a two-column grid inside the existing `max-w-5xl` hero section:

- **Left column**: existing copy — eyebrow, headline, subline, CTAs
- **Right column**: `<HeroDemoPreview />` client island
- **Breakpoint**: two columns at `lg` and above. Below `lg`, single column.

**Mobile DOM order** (top to bottom):
1. Eyebrow
2. Headline
3. Subline
4. CTAs
5. `<HeroDemoPreview />` ← inserted here on mobile
6. Stats row

On `lg+`, the preview is in the right column and the stats row is below the CTAs in the left column (its current position).

**Mobile stats row fix**: The stats row currently stacks on mobile (`flex-col`). Change to always `flex-row` with `flex-wrap` allowed but a smaller gap so it stays on one line at typical mobile widths.

---

## `HeroDemoPreview` Component

**File:** `src/components/landing/HeroDemoPreview.tsx`
**Directive:** `"use client"`

### Shell

Wraps in a `PanelShell`-style container (reuse or inline the same chrome-bar pattern from `page.tsx`) with:
- Background: `#0d0d0d`
- Border: `1px solid #1a1a1a`
- Border radius: `6px`
- Subtle glow: `box-shadow: 0 0 60px rgba(34,211,238,0.04)`
- Chrome bar label cycles with the active scene: `"JOB FEED"` → `"TAILOR"` → `"PIPELINE"`

### Scene State Machine

```ts
type Scene = 'feed' | 'tailor' | 'pipeline'
```

`useEffect` drives an interval-based sequencer. Each scene has a fixed duration; when the last scene ends the state resets to `'feed'`.

| Scene | Duration | Step |
|-------|----------|------|
| `feed` | 5 000 ms | Cards animate in |
| `tailor` | 5 000 ms | Cursor + generation |
| `pipeline` | 4 000 ms | Cards drop into columns |

Total loop: 14 000 ms.

### Scene: Feed

Three job rows animate in with `motion.div` using `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}`, staggered via `transition={{ delay: index * 0.35 }}`.

Each row contains:
- Score badge (cyan for top, dark for others): real numbers e.g. `94`, `81`, `67`
- Job title (real text, not bars): e.g. "Senior Frontend Engineer", "Product Engineer", "Full-Stack Developer"
- Company name: e.g. "Linear", "Vercel", "Stripe"
- Status tag: `GO` (cyan), `EXAMINE` (muted), nothing for low score

### Scene: Tailor

Panel shows a two-column layout: "Job Description" | "Your Resume". Both sides contain short readable text snippets (3–4 lines each, real-ish sentences, small font).

A simulated cursor (`motion.div`, small pointer SVG or `cursor` emoji-style element, absolutely positioned within the panel) starts off-screen, then:
1. Animates to hover over a "Tailor →" button (using `animate={{ x, y }}` with `transition={{ duration: 0.6, ease: 'easeInOut' }}`)
2. Does a brief scale pulse: `scale: [1, 0.85, 1]` over 150ms to simulate a click
3. After the click, the resume side transitions to show streaming text: characters appear progressively via a `useEffect` interval that appends to a string in state

The "Tailor →" button should be a small cyan-accented element consistent with the app's style.

### Scene: Pipeline

Four kanban columns: **Saved**, **Applied**, **Interview**, **Offer**.

Cards (`motion.div`) drop into columns with `initial={{ opacity: 0, y: -10 }}` → `animate={{ opacity: 1, y: 0 }}`, staggered. Each card shows a job title and company name (same real-looking content). Two cards in Saved, two in Applied, one in Interview, zero in Offer.

### Scene Transitions

`AnimatePresence mode="wait"` wraps the active scene panel. Exiting panel: `exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}`. Entering panel: `initial={{ opacity: 0, y: 6 }}` → `animate={{ opacity: 1, y: 0 }}` with `transition={{ duration: 0.25 }}`.

The chrome-bar label cross-fades with the scene using the same `AnimatePresence`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/page.tsx` | Restructure `SignedOutHero` into two-column grid; fix mobile stats row; add `<HeroDemoPreview />` in correct DOM position; add `dynamic` import |
| `src/components/landing/HeroDemoPreview.tsx` | New client component — full demo loop |
| `package.json` / `pnpm-lock.yaml` | Add `framer-motion` |

---

## Constraints

### SSR — dynamic import required

`page.tsx` is a Server Component. Framer-motion's `AnimatePresence` and `motion.*` rely on browser APIs and produce divergent server/client output, causing hydration mismatches. `HeroDemoPreview` must be loaded via `dynamic(..., { ssr: false })` at the call site — matching the existing pattern for `@uiw/react-md-editor` and `@react-pdf/renderer`:

```ts
// in page.tsx
const HeroDemoPreview = dynamic(
  () => import("@/components/landing/HeroDemoPreview"),
  { ssr: false }
);
```

### Loop reset — no flash

On pipeline scene end, state resets to `'feed'`. The reset must not fire until the pipeline exit animation completes (200ms). Use framer-motion's `onAnimationComplete` callback on the exiting pipeline panel to trigger the reset — not a bare `setTimeout`. This ensures `AnimatePresence mode="wait"` has fully unmounted the old panel before the feed re-mounts.

### React Compiler compatibility

The React Compiler (`babel-plugin-react-compiler`) may opt `HeroDemoPreview` out if framer-motion internals or the `useEffect` sequencer trigger a Rules of Hooks violation. If a console warning `[ReactCompilerHint]` appears, add `"use no memo"` at the top of the `HeroDemoPreview` function body. This is acceptable — the component is pure presentation with no expensive re-renders, so the compiler opt-out has no performance cost.

No `useMemo`, `useCallback`, or `React.memo` otherwise.

### Tailor scene — streaming text

The streaming `useEffect` appends one character per 25ms tick. The source string is ~120 characters (a short resume bullet like "Rebuilt the core data pipeline in TypeScript, reducing P99 latency by 40% and eliminating three legacy service dependencies."). At 25ms/char that fills in ~3 000ms — within the 5 000ms scene window after the ~750ms cursor animation.

The `useEffect` that drives the interval **must return a cleanup function** that clears the interval. When the scene transitions away (the component unmounts via `AnimatePresence`), the cleanup prevents `setState` calls on an unmounted component.

### General

- All colours inline hex consistent with landing page palette (`#22d3ee` cyan, `#080808` base, `#0d0d0d` surface, `#1a1a1a` border)
- No new dependencies beyond `framer-motion`
