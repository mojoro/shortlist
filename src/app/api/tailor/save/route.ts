import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { tailorSaveSchema } from "@/lib/validations";
import { getModels } from "@/lib/models";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = tailorSaveSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { tailoredResumeId, jobId, markdown, wasExported } = parsed.data;

    // Verify job ownership and load relations
    const job = await prisma.job.findFirst({
      where: { id: jobId },
      include: {
        profile: { select: { userId: true, id: true, customTailorModel: true, customAnalyzeModel: true, customExtractModel: true } },
        application: { select: { id: true, status: true } },
      },
    });

    if (!job || job.profile.userId !== userId) {
      return new Response("Not found", { status: 404 });
    }

    // Ensure Application exists
    let application = job.application;
    if (!application) {
      application = await prisma.application.create({
        data: {
          jobId,
          profileId: job.profileId,
          status: "INTERESTED",
          statusUpdatedAt: new Date(),
        },
        select: { id: true, status: true },
      });
    }

    // Create or update TailoredResume
    let tailoredResume;
    if (tailoredResumeId) {
      // Verify the resume belongs to this application before updating
      const existing = await prisma.tailoredResume.findFirst({
        where: { id: tailoredResumeId, applicationId: application.id },
        select: { id: true },
      });
      if (!existing) return new Response("Not found", { status: 404 });

      tailoredResume = await prisma.tailoredResume.update({
        where: { id: tailoredResumeId },
        data: {
          markdown,
          ...(wasExported ? { wasExported: true, exportedAt: new Date() } : {}),
        },
        select: { id: true },
      });
    } else {
      tailoredResume = await prisma.tailoredResume.create({
        data: {
          applicationId: application.id,
          markdown,
          generatedBy: getModels(job.profile).tailor,
          wasExported: wasExported ?? false,
          ...(wasExported ? { exportedAt: new Date() } : {}),
        },
        select: { id: true },
      });
    }

    // Handle export side-effects
    if (wasExported) {
      await prisma.$transaction([
        prisma.application.update({
          where: { id: application.id },
          data: {
            exportedResumeMarkdown: markdown,
            exportedAt: new Date(),
            ...(application.status === "INTERESTED"
              ? { status: "APPLIED", statusUpdatedAt: new Date(), appliedAt: new Date() }
              : {}),
          },
        }),
        prisma.job.update({
          where: { id: jobId },
          data: { feedStatus: "ARCHIVED" },
        }),
      ]);

      revalidatePath("/dashboard");
      revalidatePath("/pipeline");
    }

    return Response.json({ tailoredResumeId: tailoredResume.id });
  } catch (err) {
    console.error("[/api/tailor/save]", err);
    return Response.json(
      { error: "Failed to save resume. Please try again." },
      { status: 500 }
    );
  }
}
