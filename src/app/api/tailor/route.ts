import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openrouter, MODEL } from "@/lib/openrouter";
import { tailorSchema } from "@/lib/validations";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = tailorSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { jobId, additionalContext } = parsed.data;

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

    const systemPrompt = `You are a professional resume writer. You have been given:
1. A candidate's comprehensive CV — their complete career history, all skills, all achievements
2. ${formatTemplate ? "Their preferred resume format — a sample resume showing how they like to structure and present their experience" : "No format template (use clean, professional markdown structure)"}
3. A specific job description

Your task is to produce a focused, targeted resume for this job. Steps:
1. Read the full CV to understand the complete depth of the candidate's experience and skills.
2. Read the job description to understand what this employer needs.
3. Consider the candidate's goals and preferences.
4. Select the most relevant experience, skills, and achievements — omit anything that doesn't strengthen this application.
5. Mirror the job description's language and keywords where accurate and honest.
6. Order bullets and sections by relevance to this specific role.
7. ${formatTemplate ? "Use the format template as the structural guide — match its layout, section order, and style." : "Use a clean, professional format."}
8. Place the candidate's contact details at the very top of the resume.
9. Do not invent experience the candidate does not have.
10. Return only the resume markdown — no commentary, no preamble, no explanation.`;

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

    const stream = await openrouter.chat.completions.create({
      model: MODEL,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 2000,
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
    return Response.json(
      { error: "Resume generation failed. Please try again." },
      { status: 500 }
    );
  }
}
