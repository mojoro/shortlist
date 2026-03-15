import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openrouter, MODEL } from "@/lib/openrouter";
import { extractJobSchema } from "@/lib/validations";
import TurndownService from "turndown";

const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

const URL_RE = /^https?:\/\//i;

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
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { input, profileId } = parsed.data;

  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId } });
  if (!profile) return new Response("Profile not found", { status: 404 });

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
    try {
      const res = await fetch(input.trim(), {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Shortlist-bot/1.0)" },
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
  } else {
    cleanedText = input;
  }

  // AI extraction
  try {
    const response = await openrouter.chat.completions.create({
      model: MODEL,
      max_tokens: 250,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user",   content: cleanedText.slice(0, 12000) },
      ],
    });

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
