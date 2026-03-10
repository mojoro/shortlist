# Project Scaffold Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install all stack dependencies and wire up foundational infrastructure (Prisma, env validation, next-themes, path aliases, next.config.ts, .env.example) — no UI.

**Architecture:** Each concern is an independent file with no circular dependencies. `src/env.ts` is the single source of truth for all environment variables; everything else imports from it. `src/lib/prisma.ts` is the singleton DB client. `src/config/app.ts` owns the app name. The root layout gets the ThemeProvider wrapper.

**Tech Stack:** Next.js 16 App Router, Prisma + Neon (PostgreSQL), Clerk, OpenRouter (openai package), next-themes, @t3-oss/env-nextjs, zod, date-fns, @uiw/react-md-editor, @react-pdf/renderer, svix, pdf-parse

---

## Chunk 1: Prisma schema setup

### Task 1: Move schema.prisma and fix missing fields

**Files:**
- Move: `schema.prisma` → `prisma/schema.prisma`
- Modify: `prisma/schema.prisma` — add `onboardingCompletedAt`, fix `currency` default, add ScrapeRun→Profile relation, add scrapeRuns to Profile

- [ ] Create `prisma/` directory and move the schema file

```bash
mkdir -p prisma
mv schema.prisma prisma/schema.prisma
```

- [ ] Add `onboardingCompletedAt DateTime?` to Profile model (after `isActive` line)

```prisma
onboardingCompletedAt DateTime?  // null = wizard not finished; used by middleware
```

- [ ] Change `currency String` to `currency String @default("EUR")` on Profile

- [ ] Add `scrapeRuns ScrapeRun[]` to Profile relations block

- [ ] Add `profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)` to ScrapeRun model

- [ ] Run `npx prisma validate` to confirm schema is valid

Expected: `The schema at prisma/schema.prisma is valid`

- [ ] Commit

```bash
git add prisma/schema.prisma
git rm schema.prisma
git commit -m "Move schema to prisma/ and add missing fields from CLAUDE.md"
```

---

## Chunk 2: Install dependencies

### Task 2: Install runtime dependencies

**Files:**
- Modify: `package.json`

- [ ] Install runtime packages

```bash
npm install prisma @prisma/client @clerk/nextjs openai next-themes @t3-oss/env-nextjs date-fns @uiw/react-md-editor @react-pdf/renderer svix pdf-parse
```

- [ ] Install dev-only types

```bash
npm install -D @types/pdf-parse
```

- [ ] Run `npx prisma generate` to generate the Prisma client types from the new schema location

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` output, no errors.

- [ ] Commit

```bash
git add package.json package-lock.json
git commit -m "Install full stack dependencies"
```

---

## Chunk 3: App config and env validation

### Task 3: Create src/config/app.ts

**Files:**
- Create: `src/config/app.ts`

- [ ] Write the file

```ts
// src/config/app.ts
export const APP_CONFIG = {
  name: "Shortlist",
  tagline: "Your AI-powered job search, end to end.",
  url: "https://shortlist.johnmoorman.com", // update when domain is confirmed
} as const;
```

- [ ] Commit

```bash
git add src/config/app.ts
git commit -m "Add APP_CONFIG — single source of truth for app name"
```

### Task 4: Create src/env.ts

**Files:**
- Create: `src/env.ts`

- [ ] Write the file

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL:         z.string().url(),
    DIRECT_URL:           z.string().url(),
    CLERK_SECRET_KEY:     z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().min(1),
    OPENROUTER_API_KEY:   z.string().min(1),
    APIFY_API_TOKEN:      z.string().min(1),
    CRON_SECRET:          z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL:               z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL:                      process.env.DATABASE_URL,
    DIRECT_URL:                        process.env.DIRECT_URL,
    CLERK_SECRET_KEY:                  process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET:              process.env.CLERK_WEBHOOK_SECRET,
    OPENROUTER_API_KEY:                process.env.OPENROUTER_API_KEY,
    APIFY_API_TOKEN:                   process.env.APIFY_API_TOKEN,
    CRON_SECRET:                       process.env.CRON_SECRET,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL:               process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

- [ ] Commit

```bash
git add src/env.ts
git commit -m "Add env validation with @t3-oss/env-nextjs"
```

---

## Chunk 4: TypeScript config and Next.js config

### Task 5: Add baseUrl to tsconfig.json

**Files:**
- Modify: `tsconfig.json`

The `@/*` alias already exists. Only `baseUrl: "."` is missing.

- [ ] Add `"baseUrl": "."` to compilerOptions

- [ ] Commit

```bash
git add tsconfig.json
git commit -m "Add baseUrl to tsconfig for @/ path aliases"
```

### Task 6: Rewrite next.config.ts

**Files:**
- Modify: `next.config.ts`

- [ ] Replace the file contents with the full config from CLAUDE.md

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  transpilePackages: ["@uiw/react-md-editor", "@uiw/react-markdown-preview"],
};

export default nextConfig;
```

- [ ] Commit

```bash
git add next.config.ts
git commit -m "Configure next.config.ts with image domains and transpilePackages"
```

---

## Chunk 5: Prisma singleton and next-themes

### Task 7: Create src/lib/prisma.ts

**Files:**
- Create: `src/lib/prisma.ts`

- [ ] Write the Prisma singleton

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] Commit

```bash
git add src/lib/prisma.ts
git commit -m "Add Prisma client singleton"
```

### Task 8: Configure next-themes in layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/providers/ThemeProvider.tsx` (client component wrapper)

next-themes requires a `"use client"` component around `ThemeProvider`. We cannot put `"use client"` on the layout itself.

- [ ] Create the client-side wrapper

```ts
// src/components/providers/ThemeProvider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={process.env.NEXT_PUBLIC_DEFAULT_THEME ?? "system"}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] Update src/app/layout.tsx to wrap children with ThemeProvider

Read the current layout first, then add the import and wrapper.

- [ ] Commit

```bash
git add src/components/providers/ThemeProvider.tsx src/app/layout.tsx
git commit -m "Set up next-themes ThemeProvider"
```

---

## Chunk 6: Package.json build script and .env.example

### Task 9: Update package.json build script

**Files:**
- Modify: `package.json`

- [ ] Change `"build": "next build"` to `"build": "prisma migrate deploy && next build"`

- [ ] Commit

```bash
git add package.json
git commit -m "Add prisma migrate deploy to build script"
```

### Task 10: Create .env.example

**Files:**
- Create: `.env.example`

- [ ] Write the file

```bash
# Neon (PostgreSQL)
DATABASE_URL=
DIRECT_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# OpenRouter (Anthropic via OpenRouter — do not use Anthropic SDK directly)
OPENROUTER_API_KEY=

# Apify
APIFY_API_TOKEN=

# Cron (long random string — protects /api/scrape from public access)
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=

# Theme: "light" | "dark" | "system"
NEXT_PUBLIC_DEFAULT_THEME=system
```

- [ ] Confirm `.gitignore` contains `.env`, `.env.local`, `.env.*.local`

- [ ] Commit

```bash
git add .env.example
git commit -m "Add .env.example with all required environment variables"
```

---

## Chunk 7: Final type-check

### Task 11: Run type-check

- [ ] Run `npx tsc --noEmit` and fix any errors

```bash
npx tsc --noEmit
```

Expected: exit code 0, no errors.

- [ ] If any errors: fix them, then commit the fixes with a descriptive message.
