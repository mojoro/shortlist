import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openrouter } from "@/lib/openrouter";
import { getModels } from "@/lib/models";
import { extractJobSchema } from "@/lib/validations";
import { incrementUsage, checkUsageLimit } from "@/lib/usage";
import TurndownService from "turndown";

const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
td.remove(["script", "style", "noscript", "iframe"]);

const URL_RE = /^https?:\/\//i;

/** Block SSRF by rejecting URLs that resolve to private/reserved IP ranges. */
function isPrivateHostname(hostname: string): boolean {
  // Block obvious private hostnames
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower === "[::1]"
  ) {
    return true;
  }

  // Block private IP ranges
  const parts = lower.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (
      a === 10 ||                         // 10.0.0.0/8
      a === 127 ||                        // 127.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) ||          // 192.168.0.0/16
      (a === 169 && b === 254) ||          // 169.254.0.0/16 (link-local / cloud metadata)
      a === 0                              // 0.0.0.0/8
    ) {
      return true;
    }
  }

  return false;
}

const EXTRACTION_SYSTEM_PROMPT = `Extract structured job listing metadata from the text below. Return ONLY valid JSON — no markdown fences, no explanation:
{
  "title": "string",
  "company": "string",
  "location": "string or null",
  "locationType": "REMOTE" | "HYBRID" | "ONSITE" | null,
  "url": "string or null",
  "postedAt": "YYYY-MM-DD or null",
  "jobType": "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" | null,
  "salaryMin": integer or null,
  "salaryMax": integer or null,
  "currency": "string or null",
  "skills": ["string"]
}
Use null for any field you cannot determine with confidence. Do not include a description field.`;

interface ExtractionResult {
  title: string;
  company: string;
  location: string | null;
  locationType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  url: string | null;
  postedAt: string | null;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  skills: string[];
}

function isValidResult(parsed: unknown): parsed is ExtractionResult {
  if (typeof parsed !== "object" || parsed === null) return false;
  const p = parsed as Record<string, unknown>;
  return typeof p.title === "string" && typeof p.company === "string";
}

function parseAiResponse(text: string): ExtractionResult | null {
  try {
    const direct = JSON.parse(text.trim());
    if (isValidResult(direct)) return direct;
  } catch {}

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (isValidResult(parsed)) return parsed;
  } catch {}

  return null;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = extractJobSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request" },
      { status: 400 },
    );
  }

  const { input, profileId } = parsed.data;

  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId } });
  if (!profile) return new Response("Profile not found", { status: 404 });

  const models = getModels(profile);

  // Usage limit check
  const withinLimit = await checkUsageLimit(userId);
  if (!withinLimit) {
    return Response.json(
      { error: "Monthly AI usage limit reached." },
      { status: 429 },
    );
  }

  // Resolve input to clean text
  let cleanedText: string;
  const isUrl = URL_RE.test(input.trim());

  // Dedup check — skip AI entirely if this URL is already in the profile's feed
  if (isUrl) {
    const existing = await prisma.job.findFirst({
      where: { profileId, jobPool: { source: "CUSTOM", externalId: input.trim() } },
      select: { id: true },
    });
    if (existing) {
      return Response.json(
        { error: "You've already imported this job listing." },
        { status: 409 },
      );
    }
  }

  if (isUrl) {
    // Validate URL target to prevent SSRF attacks against internal services
    try {
      const parsed = new URL(input.trim());
      if (isPrivateHostname(parsed.hostname)) {
        return Response.json(
          { error: "That URL points to a private or internal address." },
          { status: 422 },
        );
      }
    } catch {
      return Response.json({ error: "Invalid URL." }, { status: 422 });
    }

    try {
      const res = await fetch(input.trim(), {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Shortlist-bot/1.0)" },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      cleanedText = td.turndown(html);
    } catch (err) {
      console.error("[/api/jobs/extract] URL fetch failed:", err);
      return Response.json(
        { error: "We couldn't fetch that URL. Try pasting the page text directly instead." },
        { status: 422 },
      );
    }
  } else if (/<[a-z][\s\S]*>/i.test(input)) {
    // Input contains HTML (e.g. from the Chrome extension) — convert to markdown
    cleanedText = td.turndown(input);
  } else {
    cleanedText = input;
  }

  // AI extraction
  try {
    const response = await openrouter.chat.completions.create({
      model: models.extract,
      max_tokens: 500,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user",   content: cleanedText.slice(0, 24000) },
      ],
    });

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    await incrementUsage(userId, inputTokens, outputTokens, "analysis");

    const text   = response.choices[0]?.message?.content ?? "";
    const result = parseAiResponse(text);

    if (!result) {
      console.error("[/api/jobs/extract] Could not parse AI response:", text.slice(0, 200));
      return Response.json(
        { error: "We couldn't read that listing. Try pasting the text directly instead." },
        { status: 422 },
      );
    }

    // If the user gave us a URL we already know it — don't trust the AI to reproduce it
    if (isUrl) result.url = input.trim();

    return Response.json({ ...result, description: cleanedText.slice(0, 50000) });
  } catch (err) {
    console.error("[/api/jobs/extract]", err);
    return Response.json(
      { error: "Extraction failed. Please try again." },
      { status: 500 },
    );
  }
}
