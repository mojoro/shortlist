import type { Metadata } from "next";
import { DashboardClient } from "@/app/(dashboard)/dashboard/_components/DashboardClient";

export const metadata: Metadata = { title: "Your matches" };

const VALID_FILTERS = ["all", "new", "saved", "applied", "ignored"] as const;
const VALID_SORTS   = ["match", "newest", "salary"] as const;
const VALID_DIRS    = ["asc", "desc"] as const;

interface PageProps {
  searchParams: Promise<{ filter?: string; sort?: string; dir?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { filter = "all", sort = "match", dir = "desc" } = await searchParams;

  const safeFilter = (VALID_FILTERS as readonly string[]).includes(filter)
    ? filter
    : "all";
  const safeSort = (VALID_SORTS as readonly string[]).includes(sort)
    ? sort
    : "match";
  const safeDir = (VALID_DIRS as readonly string[]).includes(dir)
    ? dir
    : "desc";

  return (
    <DashboardClient
      initialFilter={safeFilter}
      initialSort={safeSort}
      initialDir={safeDir}
    />
  );
}
