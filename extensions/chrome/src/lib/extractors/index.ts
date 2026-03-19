import { greenhouseExtractor } from "./greenhouse";
import { leverExtractor } from "./lever";
import { collectPageContent } from "./generic";
import type { Extractor, ExtractionResult } from "../../types";

const extractors: Extractor[] = [greenhouseExtractor, leverExtractor];

/**
 * Attempt extraction using a site-specific extractor first, then fall back
 * to the generic page content collector for AI extraction on the server.
 */
export function extractFromPage(): ExtractionResult {
  const url = window.location.href;

  for (const extractor of extractors) {
    if (extractor.matches.test(url)) {
      const data = extractor.extract();
      if (data) return { type: "structured", data };
      // Extractor matched URL but failed to parse -- fall through to generic
      break;
    }
  }

  // Generic fallback: collect raw page content for AI extraction
  const content = collectPageContent();
  if (content.html.length < 100) return { type: "none" };

  return { type: "generic", ...content };
}
