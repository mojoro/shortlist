import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openrouter } from "@/lib/openrouter";
import { getModels } from "@/lib/models";
import { normalizeExtractionSchema } from "@/lib/validations";
import TurndownService from "turndown";

const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
td.remove(["script", "style", "noscript", "iframe"]);

const SYSTEM_PROMPT = `Normalize these raw job listing fields into structured data. Return ONLY valid JSON — no markdown fences, no explanation:

{
  "title": "cleaned title string",
  "company": "cleaned company name",
  "location": "cleaned location string or null",
  "locationType": "REMOTE" or "HYBRID" or "ONSITE" or null,
  "postedAt": "YYYY-MM-DD or null",
  "jobType": "FULL_TIME" or "PART_TIME" or "CONTRACT" or "FREELANCE" or "INTERNSHIP" or null,
  "salaryMin": integer or null,
  "salaryMax": integer or null,
  "currency": "USD" or "EUR" or "GBP" etc or null,
  "skills": ["skill1", "skill2"]
}

Rules:
- Parse salary ranges like "$120K - $180K" into salaryMin: 120000, salaryMax: 180000, currency: "USD"
- Convert hourly rates to annual (multiply by 2080)
- Extract individual skills from comma-separated or bullet-pointed lists
- Use null for anything you cannot determine`;

interface NormalizeResult {
  title: string;
  company: string;
  location: string | null;
  locationType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  postedAt: string | null;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  skills: string[];
}

function isValidResult(parsed: unknown): parsed is NormalizeResult {
  if (typeof parsed !== "object" || parsed === null) return false;
  const p = parsed as Record<string, unknown>;
  return typeof p.title === "string" && typeof p.company === "string";
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = normalizeExtractionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { profileId } = parsed.data;

  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId } });
  if (!profile) return new Response("Profile not found", { status: 404 });

  const usage = await prisma.usage.findUnique({ where: { userId } });
  if (usage && usage.currentMonthInputTokens >= usage.monthlyLimitInputTokens) {
    return Response.json(
      { error: "Monthly AI usage limit reached." },
      { status: 429 },
    );
  }

  const models = getModels(profile);

  // Convert description HTML to markdown (no AI needed for this)
  const descriptionMarkdown = td.turndown(parsed.data.descriptionHtml);

  // Build compact user message from extracted fields
  const fields = [
    `Title: ${parsed.data.title ?? "unknown"}`,
    `Company: ${parsed.data.company ?? "unknown"}`,
    `Location: ${parsed.data.location ?? "unknown"}`,
    `Salary: ${parsed.data.salaryText ?? "unknown"}`,
    `Job Type: ${parsed.data.jobTypeText ?? "unknown"}`,
    `Skills: ${parsed.data.skillsText ?? "unknown"}`,
    `Posted: ${parsed.data.postedDateText ?? "unknown"}`,
  ].join("\n");

  try {
    const response = await openrouter.chat.completions.create({
      model: models.extract,
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: fields },
      ],
    });

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    if (inputTokens > 0) {
      await prisma.usage.upsert({
        where: { userId },
        create: {
          userId,
          totalInputTokens: inputTokens,
          totalOutputTokens: outputTokens,
          currentMonthInputTokens: inputTokens,
          currentMonthOutputTokens: outputTokens,
          analysisCallCount: 1,
        },
        update: {
          totalInputTokens: { increment: inputTokens },
          totalOutputTokens: { increment: outputTokens },
          currentMonthInputTokens: { increment: inputTokens },
          currentMonthOutputTokens: { increment: outputTokens },
          analysisCallCount: { increment: 1 },
        },
      });
    }

    const text = response.choices[0]?.message?.content ?? "";

    let result: NormalizeResult;
    try {
      const direct = JSON.parse(text.trim());
      if (isValidResult(direct)) {
        result = direct;
      } else {
        throw new Error("Invalid shape");
      }
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("[/api/jobs/extract/normalize] No JSON in response:", text.slice(0, 200));
        return Response.json(
          { error: "Could not normalize the extracted data." },
          { status: 422 },
        );
      }
      try {
        const extracted = JSON.parse(match[0]);
        if (!isValidResult(extracted)) {
          console.error("[/api/jobs/extract/normalize] Invalid shape:", text.slice(0, 200));
          return Response.json(
            { error: "Could not normalize the extracted data." },
            { status: 422 },
          );
        }
        result = extracted;
      } catch {
        console.error("[/api/jobs/extract/normalize] JSON parse failed:", text.slice(0, 200));
        return Response.json(
          { error: "Could not normalize the extracted data." },
          { status: 422 },
        );
      }
    }

    return Response.json({
      ...result,
      description: descriptionMarkdown,
      url: parsed.data.url,
    });
  } catch (err) {
    console.error("[/api/jobs/extract/normalize]", err);
    return Response.json(
      { error: "Normalization failed. Please try again." },
      { status: 500 },
    );
  }
}
