import { getCachedSelectors, applySelectors, stripDomSkeleton } from "./generic";
import type { ExtractionResult } from "../../types";

export async function extractFromPage(): Promise<ExtractionResult> {
  const domain = window.location.hostname;

  const cached = await getCachedSelectors(domain);
  if (cached) {
    const raw = applySelectors(cached);
    if (raw) return { type: "extracted", raw };
  }

  const skeleton = stripDomSkeleton();
  if (!skeleton || skeleton.length < 50) return { type: "none" };

  return {
    type: "needs_identification",
    skeleton,
    url: window.location.href,
    domain,
  };
}
