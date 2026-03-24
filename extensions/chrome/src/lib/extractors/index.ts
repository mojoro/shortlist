import { linkedinExtractor } from "./linkedin";
import { greenhouseExtractor } from "./greenhouse";
import { leverExtractor } from "./lever";
import { ashbyExtractor } from "./ashby";
import { usajobsExtractor } from "./usajobs";
import { indeedExtractor } from "./indeed";
import { glassdoorExtractor } from "./glassdoor";
import { collectPageContent } from "./generic";
import type { Extractor, ExtractionResult } from "../../types";

const extractors: Extractor[] = [
  linkedinExtractor,
  greenhouseExtractor,
  leverExtractor,
  ashbyExtractor,
  usajobsExtractor,
  indeedExtractor,
  glassdoorExtractor,
];

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

  // Generic fallback: collect raw page content for AI extraction.
  // The user clicked the extension, so trust that there's a job on this page.
  const content = collectPageContent();
  return { type: "generic", ...content };
}
