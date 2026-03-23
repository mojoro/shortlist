// AI model constants and resolution helper.
// Separated from openrouter.ts so client components can import
// model names without pulling in the OpenAI client (which requires
// server-only env vars).

/** Resume tailoring — large, high-quality model for nuanced writing */
export const TAILOR_MODEL = "qwen/qwen3.5-397b-a17b";

/** Job match scoring — fast, cheap model good at structured JSON output */
export const ANALYZE_MODEL = "anthropic/claude-haiku-4.5";

/** Job listing extraction — simple structured extraction from pasted text */
export const EXTRACT_MODEL = "anthropic/claude-haiku-4.5";

/** Borderline candidate triage — fast multimodal model for batch classification */
export const TRIAGE_MODEL = "google/gemini-2.5-flash";

/**
 * Resolve which models to use for AI tasks, preferring profile overrides
 * when set and falling back to the defaults above.
 */
export function getModels(profile: {
  customTailorModel: string | null;
  customAnalyzeModel: string | null;
  customExtractModel: string | null;
}) {
  return {
    tailor: profile.customTailorModel || TAILOR_MODEL,
    analyze: profile.customAnalyzeModel || ANALYZE_MODEL,
    extract: profile.customExtractModel || EXTRACT_MODEL,
    triage: TRIAGE_MODEL,
  };
}
