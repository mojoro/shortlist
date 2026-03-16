# Landing Page Overhaul — Design Spec
**Date:** 2026-03-17
**Branch:** `refactor/landing-overhaul` (new branch from `main`)
**Files touched:** `src/app/page.tsx`, `src/components/landing/LandingNav.tsx`, `src/app/globals.css` (no new deps)

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
- Slim, borderless (no bottom border)
- Left: BrandMark (existing SVG) + "Shortlist" wordmark in white
- Right: "Sign in" (muted text link) + "Get started" (white filled button) + ThemeToggle
- Signed-in variant: avatar initial chip + "Dashboard →" button + ThemeToggle (unchanged from current)
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
- "shortlist." in the headline is the accent moment — but still white, just the period gives it a beat
- Subline: ~13px, muted grey, `max-w-[360px]`
- CTAs: white filled primary + ghost secondary
- Stats row: 3 items separated by hairline dividers — "Free / Always", "<2m / Setup", "AI / Match scoring"
- Stats separated from CTAs by generous vertical space (~52px)

### 3. Feature section — Raycast attribute style

Section eyebrow label: `WHAT IT DOES` in small caps, very muted

Seven features, each as a horizontal row:
- Left: `flex: 0 0 220px` — bold attribute statement + one-paragraph description
- Right: `flex: 1` — dark product panel with a mock browser chrome bar and UI mockup inside

Attribute statements (copy):
1. **Matched.** *Not just recent.* — Job feed panel (score badges, GO/EXAMINE tags)
2. **Analyzed.** *Every angle.* — Job detail panel (score, match points, gap points, AI summary)
3. **Import.** *Anything.* — Import panel (URL/text input → extracted preview)
4. **Tailored.** *In seconds.* — Tailor panel (split JD + resume, Export PDF button)
5. **Yours.** *Down to the phrasing.* — Writing rules panel (protected phrases, banned phrases, never claim tags)
6. **Tracked.** *All of it.* — Pipeline panel (kanban columns: Interested → Applied → Interview → Offer)
7. **Multi-track.** *One account.* — Profiles panel (active/inactive profile rows with Switch buttons)

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
- `max-w-5xl` centered, `flex` row: BrandMark + "Shortlist" on the left, "Built by John Moorman" (linked to johnmoorman.com) on the right
- All in very muted grey — barely there

---

## Implementation Notes

### Branch
Create `refactor/landing-overhaul` from `main`. The only production files changed are:
- `src/app/page.tsx` — full rewrite
- `src/components/landing/LandingNav.tsx` — minor: remove bottom border class

### No new dependencies
All mockup UI in the feature panels is plain HTML/CSS — no images, no icons library, no animation library. The product panels are CSS-only representations of the real UI.

### Light mode
The page uses hardcoded dark values, not CSS variables. It will look the same in light and dark mode — the landing page is intentionally always-dark (portfolio aesthetic). The `ThemeToggle` in the nav still controls the app interior.

To achieve always-dark on the landing page without affecting the rest of the app: wrap the page root div in a `.dark` class override, or use inline styles / hardcoded hex values throughout.

**Decision: use hardcoded hex values** throughout `page.tsx` rather than `.dark` class injection, to keep the implementation simple and avoid side effects on the global theme.

### Signed-in state
Hero section still shows the personalized "Welcome back, [name]" variant when the user is authenticated (existing logic preserved). The visual treatment updates to match the new monochrome style.

### Responsive
- Nav: collapses to logo + single "Get started" button on mobile (hide "Sign in" text link)
- Hero: headline scales down via `clamp()`, stats row stacks or reduces to 2 items on small screens
- Feature rows: stack vertically on mobile (copy above, panel below), `flex-direction: column` at `< md`
- CTA strip: unchanged (already centered)

---

## What Is Not Changing
- `src/components/ui/BrandMark.tsx` — unchanged
- `src/app/globals.css` — unchanged (purple accent stays for the app interior)
- All app routes, dashboard, pipeline, tailor — unaffected
- `AppNav.tsx` (sidebar) — unaffected
