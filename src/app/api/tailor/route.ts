import { auth } from "@clerk/nextjs/server";
import { appendFileSync } from "fs";
import { prisma } from "@/lib/prisma";
import { openrouter } from "@/lib/openrouter";
import { getModels } from "@/lib/models";
import { tailorSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const host = req.headers.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.");

  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const { allowed, retryAfterMs } = checkRateLimit(userId, "tailor", 5);
    if (!allowed) {
      return Response.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = tailorSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { jobId, additionalContext } = parsed.data;

    if (process.env.NODE_ENV === "development") {
      console.log(`[/api/tailor] Entry — userId: ${userId}, jobId: ${jobId}`);
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId },
      include: {
        jobPool: true,
        profile: {
          select: {
            userId: true,
            curriculumVitae: true,
            masterResume: true,
            displayName: true,
            email: true,
            phone: true,
            location: true,
            linkedinUrl: true,
            portfolioUrl: true,
            githubUrl: true,
            skills: true,
            targetRoles: true,
            targetLocations: true,
            currency: true,
            targetSalaryMin: true,
            targetSalaryMax: true,
            requiredSkills: true,
            niceToHaveSkills: true,
            remotePreference: true,
            protectedPhrases: true,
            bannedPhrases: true,
            verifiedMetrics: true,
            neverClaim: true,
            customTailorModel: true,
            customAnalyzeModel: true,
            customExtractModel: true,
          },
        },
      },
    });

    if (!job || job.profile.userId !== userId) {
      return new Response("Not found", { status: 404 });
    }

    // Need at least a CV or a master resume to generate from
    if (!job.profile.curriculumVitae && !job.profile.masterResume) {
      return Response.json(
        { error: "No experience profile found. Please add your CV in Settings." },
        { status: 400 }
      );
    }

    const usage = await prisma.usage.findUnique({ where: { userId } });
    if (
      usage &&
      usage.currentMonthInputTokens >= usage.monthlyLimitInputTokens
    ) {
      return Response.json(
        { error: "Monthly AI usage limit reached. Try again next month." },
        { status: 429 }
      );
    }

    const { profile } = job;
    const models = getModels(profile);

    // Build contact header lines for the resume
    const contactLines: string[] = [];
    if (profile.displayName) contactLines.push(`Name: ${profile.displayName}`);
    if (profile.email) contactLines.push(`Email: ${profile.email}`);
    if (profile.phone) contactLines.push(`Phone: ${profile.phone}`);
    if (profile.location) contactLines.push(`Location: ${profile.location}`);
    if (profile.linkedinUrl) contactLines.push(`LinkedIn: ${profile.linkedinUrl}`);
    if (profile.portfolioUrl) contactLines.push(`Portfolio: ${profile.portfolioUrl}`);
    if (profile.githubUrl) contactLines.push(`GitHub: ${profile.githubUrl}`);

    // Build candidate goals section from profile criteria
    const goalLines: string[] = [];
    if (profile.targetRoles.length > 0)
      goalLines.push(`- Target roles: ${profile.targetRoles.join(", ")}`);
    if (profile.targetLocations.length > 0)
      goalLines.push(`- Target locations: ${profile.targetLocations.join(", ")}`);
    if (profile.remotePreference !== "ANY")
      goalLines.push(`- Remote preference: ${profile.remotePreference.replace(/_/g, " ").toLowerCase()}`);
    if (profile.targetSalaryMin || profile.targetSalaryMax) {
      const range = [profile.targetSalaryMin, profile.targetSalaryMax]
        .filter(Boolean)
        .join("–");
      goalLines.push(`- Salary target: ${range} ${profile.currency}/year`);
    }
    if (profile.skills.length > 0)
      goalLines.push(`- Full skills list: ${profile.skills.join(", ")}`);
    if (profile.requiredSkills.length > 0)
      goalLines.push(`- Must-have for target roles: ${profile.requiredSkills.join(", ")}`);
    if (profile.niceToHaveSkills.length > 0)
      goalLines.push(`- Nice-to-have: ${profile.niceToHaveSkills.join(", ")}`);

    // curriculumVitae is the content source; masterResume is the format template.
    // Fall back to masterResume as content if no CV is set.
    const contentSource = profile.curriculumVitae ?? profile.masterResume!;
    const formatTemplate = profile.masterResume;

    const systemPrompt = `## SYSTEM
You are a professional resume writer with a decade of experience hiring 
${profile.targetRoles.join(", ")} across verticals. 
You have been given:
1. A candidate's comprehensive CV
2. Their preferred resume format — a structural template only; 
   treat the summary and bullets in it as placeholders, not model copy
3. A specific job description

Your task is to produce a focused, targeted resume for this role.

## PROCESS

Step 1 — Understand the candidate
Read the full CV. Identify their strongest, most verifiable proof points 
(metrics, named technologies, real outcomes). Note what they have actually 
built vs. what they have only configured or used.

Step 2 — Understand the role
Identify the top 3–5 things this employer actually needs. Distinguish 
must-haves from nice-to-haves.

Step 3 — Match honestly
Select experience and skills that genuinely satisfy what the employer needs. 
Mirror the job description's language ONLY where the description accurately 
reflects what the candidate did. Do not relabel simpler work with 
more impressive JD terminology to make it appear to match. A hiring manager 
who interviews this candidate will probe every bullet — if the framing 
doesn't survive a follow-up question, cut it.

Step 4 — Write the summary
Write a new summary for this specific role. Do not reuse the template 
summary. It should be 2–3 sentences: what the candidate does, their 
most relevant proof point for this role, and one honest differentiator. 
No filler phrases ("unique blend", "expert in bridging"). Lead with 
the most impressive thing that is directly relevant to this job.
Never use an "—".

Step 5 — Write the bullets
- Every bullet must be results-oriented: action → method → outcome
- Include specific numbers wherever the CV provides them; do not omit 
  metrics in favor of vaguer language
- Do not invent, inflate, or reframe experience the candidate does not have
- Order bullets by relevance to this role, not chronology within a role
- Omit anything that doesn't strengthen this specific application
- Never use an "—".

Step 6 — Format and output
- Use the template's structure and layout
- Bold sparingly: only the single most important phrase per bullet, 
  and only where it adds scannability for a human reader. 
  If everything is bold, nothing is.
- Return only the resume markdown — no commentary, no preamble, 
  no explanation
- Ensure all links are properly formatted
- Place contact details at the very top
- Never use an "—".

Step 7 — Final Review
Think about what you have made and what could be improved. If the current version is an 8/10,
identify what would make it a 9.5/10 and implement that adjustment, but never use an "—" em-dash.${
  (profile.protectedPhrases?.length ?? 0) > 0 ||
  (profile.bannedPhrases?.length ?? 0) > 0 ||
  (profile.verifiedMetrics?.length ?? 0) > 0 ||
  (profile.neverClaim?.length ?? 0) > 0
    ? `\n\n## CANDIDATE'S WRITING RULES (non-negotiable)\n${
        (profile.protectedPhrases?.length ?? 0) > 0
          ? `\nProtected phrases — use verbatim, never paraphrase:\n${profile.protectedPhrases!.map((p) => `- ${p}`).join("\n")}`
          : ""
      }${
        (profile.bannedPhrases?.length ?? 0) > 0
          ? `\n\nBanned phrases — never use these under any circumstances:\n${profile.bannedPhrases!.map((p) => `- ${p}`).join("\n")}`
          : ""
      }${
        (profile.verifiedMetrics?.length ?? 0) > 0
          ? `\n\nVerified metrics — use exactly as written, do not round or rephrase:\n${profile.verifiedMetrics!.map((p) => `- ${p}`).join("\n")}`
          : ""
      }${
        (profile.neverClaim?.length ?? 0) > 0
          ? `\n\nNever claim — do not imply or suggest experience with these:\n${profile.neverClaim!.map((p) => `- ${p}`).join("\n")}`
          : ""
      }`
    : ""
}`;

    const userContent = [
      `## Job Description\n\n${job.jobPool.description}`,
      `## Candidate's Full CV\n\n${contentSource}`,
      contactLines.length > 0
        ? `## Candidate's Contact Details\n\n${contactLines.join("\n")}`
        : "",
      goalLines.length > 0
        ? `## Candidate's Goals & Skills\n\n${goalLines.join("\n")}`
        : "",
      formatTemplate && profile.curriculumVitae
        ? `## Preferred Resume Format (use this as structural template)\n\n${formatTemplate}`
        : "",
      additionalContext ? `## Additional Instructions\n\n${additionalContext}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    if (process.env.NODE_ENV === "development") {
      console.log(`[/api/tailor] Stream start — jobId: ${jobId}, hasCV: ${!!job.profile.curriculumVitae}, hasMasterResume: ${!!job.profile.masterResume}`);
    }
    if (isLocalhost) {
      const sep = "=".repeat(80);
      appendFileSync(
        "ai-context.log",
        `\n${sep}\n[${new Date().toISOString()}] TAILOR — jobId: ${jobId}\n\n## SYSTEM\n${systemPrompt}\n\n## USER\n${userContent}\n`,
      );
    }

    const stream = await openrouter.chat.completions.create({
      model: models.tailor,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 8000,
    });

    let inputTokens = 0;
    let outputTokens = 0;

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens ?? 0;
              outputTokens = chunk.usage.completion_tokens ?? 0;
            }
          }
        } finally {
          if (process.env.NODE_ENV === "development") {
            console.log(`[/api/tailor] Stream complete — jobId: ${jobId}, inputTokens: ${inputTokens}, outputTokens: ${outputTokens}`);
          }
          controller.close();
          // Increment usage counters — non-blocking, best-effort
          prisma.usage
            .upsert({
              where: { userId },
              create: {
                userId,
                totalInputTokens: inputTokens,
                totalOutputTokens: outputTokens,
                currentMonthInputTokens: inputTokens,
                currentMonthOutputTokens: outputTokens,
                tailorCallCount: 1,
              },
              update: {
                totalInputTokens: { increment: inputTokens },
                totalOutputTokens: { increment: outputTokens },
                currentMonthInputTokens: { increment: inputTokens },
                currentMonthOutputTokens: { increment: outputTokens },
                tailorCallCount: { increment: 1 },
              },
            })
            .catch(console.error);
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[/api/tailor]", err);
    if (process.env.NODE_ENV === "development") {
      console.log("[/api/tailor] Caught error:", err instanceof Error ? err.message : String(err));
    }
    if ((err as { status?: number }).status === 402) {
      return Response.json(
        { error: "Insufficient AI credits.", code: "INSUFFICIENT_CREDITS" },
        { status: 402 },
      );
    }
    return Response.json(
      { error: "Resume generation failed. Please try again." },
      { status: 500 }
    );
  }
}
