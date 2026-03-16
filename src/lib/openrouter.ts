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

// Resume tailoring — large, high-quality model for nuanced writing
export const TAILOR_MODEL = "qwen/qwen3.5-397b-a17b";

// Job match scoring — fast, cheap model good at structured JSON output
export const ANALYZE_MODEL = "anthropic/claude-haiku-4-5-20251001";

// Job listing extraction — simple structured extraction from pasted text
export const EXTRACT_MODEL = "anthropic/claude-haiku-4-5-20251001";
