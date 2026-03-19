import { startOfDay, subDays, isAfter } from "date-fns";

export type DateBucket = "Today" | "Yesterday" | "This week" | "Older";

function getDateBucket(createdAt: Date | string): DateBucket {
  const now = new Date();
  const todayStart     = startOfDay(now);
  const yesterdayStart = subDays(todayStart, 1);
  const weekStart      = subDays(todayStart, 7);
  const d = new Date(createdAt);
  if (isAfter(d, todayStart))     return "Today";
  if (isAfter(d, yesterdayStart)) return "Yesterday";
  if (isAfter(d, weekStart))      return "This week";
  return "Older";
}

export function groupJobsByDate<T extends { createdAt: Date | string }>(
  jobs: T[]
): { bucket: DateBucket; jobs: T[] }[] {
  const groups: { bucket: DateBucket; jobs: T[] }[] = [];
  let currentBucket: DateBucket | null = null;
  for (const job of jobs) {
    const bucket = getDateBucket(job.createdAt);
    if (bucket !== currentBucket) {
      groups.push({ bucket, jobs: [] });
      currentBucket = bucket;
    }
    groups[groups.length - 1].jobs.push(job);
  }
  return groups;
}
