import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openrouter } from "@/lib/openrouter";
import { getModels } from "@/lib/models";
import { identifySelectorsSchema } from "@/lib/validations";

const SYSTEM_PROMPT = `You are a DOM analyst. Given a stripped HTML skeleton of a job listing page, identify CSS selectors that would extract key fields. Return ONLY valid JSON — no markdown fences, no explanation:

{
  "title": "CSS selector for the job title element, or null",
  "company": "CSS selector for the company name element, or null",
  "location": "CSS selector for the job location element, or null",
  "salary": "CSS selector for the salary/compensation element, or null",
  "jobType": "CSS selector for employment type element, or null",
  "skills": "CSS selector for skills list container, or null",
  "description": "CSS selector for the main job description container, or null",
  "postedDate": "CSS selector for the posting date element, or null"
}

Rules:
- Use the most specific selector possible (prefer IDs > data attributes > semantic classes > tag hierarchy)
- For description, select the CONTAINER element (innerHTML will be extracted)
- For skills, select the LIST CONTAINER (each child will be one skill)
- Return null for any field you cannot identify with confidence
- Selectors must be valid CSS for document.querySelector()`;

interface SelectorResult {
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  jobType: string | null;
  skills: string | null;
  description: string | null;
  postedDate: string | null;
}

function isValidResult(parsed: unknown): parsed is SelectorResult {
  if (typeof parsed !== "object" || parsed === null) return false;
  const p = parsed as Record<string, unknown>;
  const fields = ["title", "company", "location", "salary", "jobType", "skills", "description", "postedDate"];
  return fields.every((f) => p[f] === null || typeof p[f] === "string");
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = identifySelectorsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { skeleton, profileId } = parsed.data;

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

  try {
    const response = await openrouter.chat.completions.create({
      model: models.triage,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: skeleton },
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
          triageCallCount: 1,
          triageInputTokens: inputTokens,
          triageOutputTokens: outputTokens,
        },
        update: {
          totalInputTokens: { increment: inputTokens },
          totalOutputTokens: { increment: outputTokens },
          currentMonthInputTokens: { increment: inputTokens },
          currentMonthOutputTokens: { increment: outputTokens },
          triageCallCount: { increment: 1 },
          triageInputTokens: { increment: inputTokens },
          triageOutputTokens: { increment: outputTokens },
        },
      });
    }

    const text = response.choices[0]?.message?.content ?? "";

    let selectors: SelectorResult;
    try {
      const direct = JSON.parse(text.trim());
      if (isValidResult(direct)) {
        selectors = direct;
      } else {
        throw new Error("Invalid shape");
      }
    } catch {
      // Try extracting JSON object from response
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("[/api/jobs/extract/identify] No JSON in response:", text.slice(0, 200));
        return Response.json(
          { error: "Could not identify selectors from this page." },
          { status: 422 },
        );
      }
      try {
        const extracted = JSON.parse(match[0]);
        if (!isValidResult(extracted)) {
          console.error("[/api/jobs/extract/identify] Invalid shape:", text.slice(0, 200));
          return Response.json(
            { error: "Could not identify selectors from this page." },
            { status: 422 },
          );
        }
        selectors = extracted;
      } catch {
        console.error("[/api/jobs/extract/identify] JSON parse failed:", text.slice(0, 200));
        return Response.json(
          { error: "Could not identify selectors from this page." },
          { status: 422 },
        );
      }
    }

    return Response.json({ selectors });
  } catch (err) {
    console.error("[/api/jobs/extract/identify]", err);
    return Response.json(
      { error: "Selector identification failed. Please try again." },
      { status: 500 },
    );
  }
}
