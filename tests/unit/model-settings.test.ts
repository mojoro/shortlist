import { describe, it, expect } from "vitest";
import {
  getModels,
  TAILOR_MODEL,
  ANALYZE_MODEL,
  EXTRACT_MODEL,
  TRIAGE_MODEL,
} from "@/lib/models";

describe("getModels", () => {
  it("returns defaults when all overrides are null", () => {
    const result = getModels({
      customTailorModel: null,
      customAnalyzeModel: null,
      customExtractModel: null,
    });

    expect(result).toEqual({
      tailor: TAILOR_MODEL,
      analyze: ANALYZE_MODEL,
      extract: EXTRACT_MODEL,
      triage: TRIAGE_MODEL,
    });
  });

  it("uses tailor override when set", () => {
    const result = getModels({
      customTailorModel: "openai/gpt-4o",
      customAnalyzeModel: null,
      customExtractModel: null,
    });

    expect(result.tailor).toBe("openai/gpt-4o");
    expect(result.analyze).toBe(ANALYZE_MODEL);
    expect(result.extract).toBe(EXTRACT_MODEL);
  });

  it("uses analyze override when set", () => {
    const result = getModels({
      customTailorModel: null,
      customAnalyzeModel: "openai/gpt-4o-mini",
      customExtractModel: null,
    });

    expect(result.tailor).toBe(TAILOR_MODEL);
    expect(result.analyze).toBe("openai/gpt-4o-mini");
    expect(result.extract).toBe(EXTRACT_MODEL);
  });

  it("uses extract override when set", () => {
    const result = getModels({
      customTailorModel: null,
      customAnalyzeModel: null,
      customExtractModel: "google/gemini-flash-1.5",
    });

    expect(result.tailor).toBe(TAILOR_MODEL);
    expect(result.analyze).toBe(ANALYZE_MODEL);
    expect(result.extract).toBe("google/gemini-flash-1.5");
  });

  it("falls back to default for empty string override", () => {
    const result = getModels({
      customTailorModel: "",
      customAnalyzeModel: "",
      customExtractModel: "",
    });

    expect(result).toEqual({
      tailor: TAILOR_MODEL,
      analyze: ANALYZE_MODEL,
      extract: EXTRACT_MODEL,
      triage: TRIAGE_MODEL,
    });
  });
});
