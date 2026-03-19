/** Infer location type from a free-text location string. */
export function inferLocationType(
  location: string | null,
): "REMOTE" | "HYBRID" | "ONSITE" | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  if (lower.includes("remote")) return "REMOTE";
  if (lower.includes("hybrid")) return "HYBRID";
  return null;
}

/** Parse a free-text job type string into a structured enum value. */
export function parseJobType(
  text: string | null,
):
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "FREELANCE"
  | "INTERNSHIP"
  | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("full")) return "FULL_TIME";
  if (lower.includes("part")) return "PART_TIME";
  if (lower.includes("contract") || lower.includes("temporary"))
    return "CONTRACT";
  if (lower.includes("freelance")) return "FREELANCE";
  if (lower.includes("intern")) return "INTERNSHIP";
  return null;
}

/** Best-effort salary range extraction from free text. */
export function parseSalaryFromText(text: string | undefined): {
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
} {
  if (!text) return { salaryMin: null, salaryMax: null, currency: null };

  const currencyMap: Record<string, string> = {
    $: "USD",
    "\u20AC": "EUR",
    "\u00A3": "GBP",
    EUR: "EUR",
    GBP: "GBP",
    CHF: "CHF",
    USD: "USD",
  };

  // Match patterns: "$120K - $180K", "60,000 - 90,000 EUR", "$120,000-$180,000/yr"
  const match = text.match(
    /([$\u20AC\u00A3]|EUR|GBP|CHF|USD)?\s*([\d,.]+)\s*[Kk]?\s*[-\u2013to]+\s*[$\u20AC\u00A3]?\s*([\d,.]+)\s*[Kk]?\s*(?:\/?\s*(?:yr|year|annum|pa))?\s*(EUR|GBP|CHF|USD)?/,
  );
  if (!match) return { salaryMin: null, salaryMax: null, currency: null };

  const currencySymbol = match[1] ?? match[4] ?? "";
  const currency = currencyMap[currencySymbol] ?? (currencySymbol || null);

  const normalize = (s: string) => {
    const n = parseFloat(s.replace(/,/g, ""));
    return text.toLowerCase().includes("k") && n < 1000 ? n * 1000 : n;
  };

  return {
    salaryMin: normalize(match[2]),
    salaryMax: normalize(match[3]),
    currency,
  };
}
