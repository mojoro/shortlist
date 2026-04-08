import { cache } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { JobDetailClient } from "./_components/JobDetailClient";

const getJob = cache(async (jobId: string) => {
  return prisma.job.findUnique({
    where: { id: jobId },
    include: {
      jobPool: true,
      profile: { select: { userId: true } },
    },
  });
});

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return { title: "Job not found" };
  return { title: `${job.jobPool.title} at ${job.jobPool.company}` };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await getJob(id);
  return <JobDetailClient jobId={id} description={job?.jobPool.description ?? null} />;
}
