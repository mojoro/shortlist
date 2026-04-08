import type { ApplicationStatus } from "@prisma/client";

/**
 * Terminal (closed) application statuses — no further action expected.
 * Exported as both a Set (for `.has()` lookups) and an array (for Prisma `notIn`).
 */
export const TERMINAL_STATUSES_ARRAY: ApplicationStatus[] = [
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "GHOSTED",
];

export const TERMINAL_STATUSES = new Set<ApplicationStatus>(
  TERMINAL_STATUSES_ARRAY,
);
