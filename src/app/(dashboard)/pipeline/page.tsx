import type { Metadata } from "next";
import { PipelineClient } from "./_components/PipelineClient";

export const metadata: Metadata = { title: "Your pipeline" };

const VALID_SORTS = ["updated", "status", "applied", "score"] as const;
const VALID_DIRS = ["asc", "desc"] as const;

interface PageProps {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}

export default async function PipelinePage({ searchParams }: PageProps) {
  const { sort = "updated", dir = "desc" } = await searchParams;

  const safeSort = (VALID_SORTS as readonly string[]).includes(sort)
    ? sort
    : "updated";
  const safeDir = (VALID_DIRS as readonly string[]).includes(dir)
    ? dir
    : "desc";

  return <PipelineClient initialSort={safeSort} initialDir={safeDir} />;
}
