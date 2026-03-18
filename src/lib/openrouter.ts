import OpenAI from "openai";
import { APP_CONFIG } from "@/config/app";
import { env } from "@/env";

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
    "X-Title": APP_CONFIG.name,
  },
});

// Re-export model constants so existing server-side imports keep working
export { TAILOR_MODEL, ANALYZE_MODEL, EXTRACT_MODEL, getModels } from "@/lib/models";
