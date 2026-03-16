# Landing Page Overhaul — Design Spec
**Date:** 2026-03-17
**Branch:** `refactor/landing-overhaul` (new branch from `main`)
**Files touched:** `src/app/page.tsx`, `src/components/landing/LandingNav.tsx` (no new deps)

---

## Context

The current landing page (`src/app/page.tsx`) uses a generic "01 / 02 / 03 steps" pattern with a purple accent color that reads as AI-template boilerplate. This project is going into John Moorman's portfolio and needs to give a strong first impression — the same quality signal as Linear, Raycast, or Supabase's marketing sites.

The app itself is non-trivial: AI job scoring, resume tailoring with writing rules, a multi-profile system, and pipeline tracking. The landing page should reflect that.

---

## Design Decisions

### Color: Monochrome
- Background: near-black (`#080808`)
- Text: pure white (`#ffffff`) for headings, stepped greys for body and muted text
- Accent: **none** — contrast and typography carry the page
- No purple. No colored CTA buttons. White button on dark background.
- Rationale: Purple is saturated by AI tools (Perplexity, Notion AI, etc.) and reads as template. Monochrome is rare in this space and signals craft.

### CSS variable impact
The existing `--accent` variable is used throughout the app. The landing page will explicitly use hardcoded monochrome values (`#ffffff`, `#0d0d0d`, `#1a1a1a`, etc.) rather than the app's CSS variables, so the interior app's purple accent is unaffected.

### Feature section pattern: Raycast attribute style
No step numbers. No "01 / 02 / 03." Each feature is a short confident statement — **"Bold word. Short proof."** — with a product UI panel alongside it.

Rationale: Numbered steps signal "I followed a landing page tutorial." The Raycast pattern says "here is what the product does" without implying a linear flow or ranking features by importance.

---

## Page Structure

### 1. Nav — `LandingNav.tsx`
- Slim, no bottom border, background `#080808` (hardcoded — not a CSS variable)
- Left: BrandMark (existing SVG) + `APP_CONFIG.name` wordmark in `#ffffff`
- Right (signed-out): "Sign in" text link in muted grey (`#555`) + "Get started" white filled button (`bg: #fff, color: #080808`) — no ThemeToggle
- Signed-in variant: avatar initial chip (white border, white initial on dark bg) + "Dashboard →" white filled button — no ThemeToggle
- ThemeToggle is **removed from the landing nav entirely**: the page is intentionally always-dark using hardcoded hex values, so a theme toggle would appear broken (clicking it visually does nothing). The toggle remains available once the user enters the app.
- Avatar chip: `border: 1px solid #333`, `border-radius: 999px`, `padding: 4px 10px`, `font-size: 12px`, `color: #fff`, `background: transparent`. Hover: border lightens to `#555`.
- "Dashboard →" button hover: `#e5e5e5`.
- Height: ~56px, `max-w-5xl` centered

### 2. Hero — text only, left-aligned
```
[eyebrow pill: AI-powered job search]

Get on the
shortlist.

[subline — max ~360px wide]
Score every listing against your background. Tailor every
application in seconds. Track your entire search in one place.

[Get started free]  [Sign in]

─────────────────────────────────────────
Free        <2m         AI
Always      Setup       Match scoring
```
- Headline: `font-size: clamp(48px, 8vw, 72px)`, `font-weight: 900`, `letter-spacing: -0.05em`, `line-height: 0.93`
- "shortlist." in the headline: the `<span>` wrapping this word **removes any accent color class** — it renders in the same `#ffffff` as the rest of the headline. No accent color. The period provides the typographic beat, not a color change.
- Subline: ~13px, muted grey, `max-w-[360px]`
- CTAs: white filled primary + ghost secondary. Primary hover: `#e5e5e5`. Ghost hover: border lightens to `#444`, text lightens to `#888`.
- Eyebrow pill: small `<span>`, border `1px solid #333`, `border-radius: 999px`, `padding: 3px 12px`, `font-size: 11px`, `color: #666`, `letter-spacing: 0.08em`, `text-transform: uppercase`. No background fill.
- Stats row: 3 items separated by hairline vertical dividers — "Free / Always", "<2m / Setup", "AI / Match scoring". Note: the `<` in `<2m` must be rendered as `{'<'}` or `&lt;` in JSX to avoid React warnings. On mobile (stacked), the vertical dividers are hidden (`display: none`).
- Stats separated from CTAs by generous vertical space (~52px)

### 3. Feature section — Raycast attribute style

Section eyebrow label: `WHAT IT DOES` in small caps, very muted

Seven features, each as a horizontal row:
- Left: `flex: 0 0 220px` — bold attribute statement + one-paragraph description
- Right: `flex: 1` — dark product panel with a mock browser chrome bar and UI mockup inside

Attribute statements (copy):
1. **Matched.** *Not just recent.* — Job feed panel (score badges, GO/EXAMINE tags)
2. **Analyzed.** *Every angle.* — Job detail panel (score, match points, gap points, AI summary)
3. **Import.** *Anything.* — Import panel mockup: URL input field (grey placeholder "https://..."), an "Extract" button, then below it a faint separator + preview card showing an extracted job title ("Senior Product Engineer") and company ("Acme Corp") in white text on `#0d0d0d`. This is a fully aspirational static mockup — no import UI exists yet. The panel communicates a planned feature direction.
4. **Tailored.** *In seconds.* — Tailor panel (split JD + resume, Export PDF button)
5. **Yours.** *Down to the phrasing.* — Writing rules panel (protected phrases, banned phrases, never claim tags). Note: `protectedPhrases`, `bannedPhrases`, `verifiedMetrics`, `neverClaim` are real `Profile` fields added to the schema in the same sprint as this landing page. The mockup shows a list of short pill-style tags ("my results", "never supervised") under section labels.
6. **Tracked.** *All of it.* — Pipeline panel (kanban columns: Interested → Applied → Interview → Offer)
7. **Multi-track.** *One account.* — Profiles panel: two profile rows, each with a label and a small "Switch" button. The "Switch" button is static decorative UI representing the `isActive` toggle (the real `Profile.isActive` boolean field); it does not need real interactivity in the mockup.

Each product panel:
- Background: `#0d0d0d`, border: `1px solid #1a1a1a`, `border-radius: 6px`
- Chrome bar: `#111` with 3 decorative dots + uppercase label (e.g., "JOB FEED")
- Interior: simplified but recognizable mockup of the real UI
- No animations needed — static mockups

Feature rows separated by hairline `border-top: 1px solid #0f0f0f`. No cards, no box shadows. Pure layout.

### 4. CTA strip
```
Start your search.
It's free.

Set up your profile in under two minutes.

[Get started free]
```
- Centered, full-width background `#0d0d0d` or just the page background with a top border
- Headline: ~26px, `font-weight: 900`
- Simple, no decoration

### 5. Footer
- `max-w-5xl` centered, `flex` row: BrandMark + `APP_CONFIG.name` (from `@/config/app`) on the left, "Built by John Moorman" (linked to johnmoorman.com) on the right
- All text: `#333` (barely there). "Built by John Moorman" link resting: `#444`, hover: `#888`.

---

## Implementation Notes

### Branch
Create `refactor/landing-overhaul` from `main`. The only production files changed are:
- `src/app/page.tsx` — full rewrite. Remains a Server Component. Auth detection: `const { userId } = await auth()` from `@clerk/nextjs/server`. If signed in, retrieve the user's first name initial via `const user = await currentUser()` (also from `@clerk/nextjs/server`) — no Prisma query needed for this. `userInitial = user?.firstName?.[0]?.toUpperCase() ?? '?'`. Passes `userId` (boolean presence) and `userInitial` as props to `<LandingNav>`.
- `src/components/landing/LandingNav.tsx` — drops `"use client"` directive entirely (ThemeToggle, which requires client, is being removed; no other client-only code remains). Hardcodes dark bg/colors. Accepts `userInitial?: string` and `isSignedIn?: boolean` props from the parent server component. Avatar chip falls back to `"?"` if `userInitial` is undefined/null.

### No new dependencies
All mockup UI in the feature panels is plain HTML/CSS — no images, no icons library, no animation library. The product panels are CSS-only representations of the real UI.

### Implementation effort: product mockup panels
The 7 CSS-only product panels (job feed, job detail, import, tailor, writing rules, pipeline, profiles) represent the bulk of the implementation work — each requires a recognizable but simplified mockup of the actual app UI using only `div`, `span`, and inline/Tailwind styles. Plan ~30–50 lines of JSX per panel. These are the most time-intensive part of the build; the nav, hero, CTA strip, and footer are straightforward by comparison.

### Light mode
The page uses hardcoded dark values, not CSS variables. It will look the same in light and dark mode — the landing page is intentionally always-dark (portfolio aesthetic). The `ThemeToggle` is not present on the landing nav; theme selection is available from within the app.

To achieve always-dark on the landing page without affecting the rest of the app: wrap the page root div in a `.dark` class override, or use inline styles / hardcoded hex values throughout.

**Decision: use hardcoded hex values** throughout `page.tsx` rather than `.dark` class injection, to keep the implementation simple and avoid side effects on the global theme.

**Base style override:** The root `<div>` in `page.tsx` uses `style={{ backgroundColor: '#080808', color: '#ffffff' }}` with `min-h-screen` to cover the full viewport. Inline styles take precedence over class-based rules, overriding any light-mode body background from `globals.css`. The `min-h-screen` ensures there are no uncoated scroll overscroll areas.

**Font family:** No custom font is added. The page uses the existing system font stack (`font-family: inherit` from the app's base styles — system-ui, -apple-system, etc.). `font-weight: 900` relies on the system font's black weight being available; this is acceptable for a portfolio project and consistent with the rest of the app.

### Signed-in state
Hero section shows a personalized "Welcome back, [name]" variant when the user is authenticated (existing logic preserved). Monochrome treatment:
- Greeting text: `#888` (muted grey), same weight as the eyebrow pill
- Name: `#ffffff`
- "Go to dashboard →" CTA: white filled button, same style as the primary CTA (bg `#fff`, color `#080808`). Hover: `#e5e5e5`.
- Hidden in signed-in variant: eyebrow pill, subline, "Get started free" button, ghost "Sign in" button, stats row — the dashboard CTA replaces all of them
- The signed-in hero is thus: greeting line + name + single "Go to dashboard →" button, left-aligned, generous vertical padding

### Responsive
- Nav (signed-out, mobile): logo + "Get started" button only — hide "Sign in" text link
- Nav (signed-in, mobile): avatar initial chip + "Dashboard →" button only — same two-item layout as signed-out
- Hero: headline scales down via `clamp()`, stats row stacks vertically (`flex-direction: column`) on `< sm` screens
- Feature rows: stack vertically on mobile (copy above, panel below), `flex-direction: column` at `< md`
- CTA strip: unchanged (already centered)

---

## What Is Not Changing
- `src/components/ui/BrandMark.tsx` — unchanged
- `src/app/globals.css` — unchanged (purple accent stays for the app interior)
- All app routes, dashboard, pipeline, tailor — unaffected
- `AppNav.tsx` (sidebar) — unaffected
