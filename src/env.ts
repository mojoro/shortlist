import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL:         z.string().url(),
    DIRECT_URL:           z.string().url(),
    CLERK_SECRET_KEY:     z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),
    OPENROUTER_API_KEY:   z.string().min(1),
    APIFY_API_TOKEN:      z.string().min(1).optional(),
    CRON_SECRET:          z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL:               z.string().url(),
    NEXT_PUBLIC_DEFAULT_THEME:         z.enum(["light", "dark", "system"]).default("system"),
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
    NEXT_PUBLIC_DEFAULT_THEME:         process.env.NEXT_PUBLIC_DEFAULT_THEME,
  },
});
