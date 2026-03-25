import { prisma } from "@/lib/prisma";
import { findMatchingPoolIds } from "@/lib/match-sql";
import { scoreAndClassify, ACCEPT_THRESHOLD } from "@/lib/match-heuristic";
import type { PoolCandidate } from "@/lib/match-heuristic";
import { triageBorderline } from "@/lib/match-ai-triage";
import type { Profile } from "@prisma/client";

/** Max candidates that proceed past Tier 2 into AI triage + Job creation. */
const MAX_CANDIDATES_PER_RUN = 50;

export type MatchPipelineResult = {
  candidatesFromSql: number;
  acceptedByHeuristic: number;
  borderlineToAi: number;
  acceptedByAi: number;
  rejectedTotal: number;
  aiTokensUsed: number;
  jobsCreated: number;
  /** Total candidates that passed heuristic scoring (before cap). */
  totalQualified: number;
};

export async function runMatchPipelineForProfile(
  profileId: string,
  profile: Profile,
): Promise<MatchPipelineResult> {

  // ── Tier 1: SQL pre-filter ──
  const tier1Ids = await findMatchingPoolIds(profileId, profile);

  if (tier1Ids.length === 0) {
    await prisma.profile.update({
      where: { id: profileId },
      data: { pendingMatchCount: 0 },
    });
    return {
      candidatesFromSql: 0, acceptedByHeuristic: 0, borderlineToAi: 0,
      acceptedByAi: 0, rejectedTotal: 0, aiTokensUsed: 0, jobsCreated: 0,
      totalQualified: 0,
    };
  }

  // ── Data handoff: fetch minimum columns ──
  // CRITICAL: Use LEFT(description, 1000), never full description
  const poolEntries = await prisma.$queryRaw<PoolCandidate[]>`
    SELECT id, title, company, location, country, region,
           LEFT(description, 1000) AS "descriptionExcerpt",
           skills, "salaryMin", "salaryMax", "jobType",
           "companySize", "locationType"
    FROM job_pool
    WHERE id = ANY(${tier1Ids})
  `;

  // ── Tier 2: Heuristic scoring ──
  const heuristicResult = scoreAndClassify(poolEntries, {
    targetRoles: profile.targetRoles,
    requiredSkills: profile.requiredSkills,
    niceToHaveSkills: profile.niceToHaveSkills,
    targetLocations: profile.targetLocations,
    workEligibility: profile.workEligibility,
    remotePreference: profile.remotePreference,
    targetSalaryMin: profile.targetSalaryMin,
    targetSalaryMax: profile.targetSalaryMax,
    currency: profile.currency,
    companySize: profile.companySize,
  });

  // ── Cap: merge accepted + borderline, take top N by confidence ──
  // This limits how many candidates reach AI (Tier 3 triage + downstream analysis).
  type QualifiedEntry = {
    id: string;
    confidence: number;
    candidate?: PoolCandidate; // present for borderline entries
  };

  const allQualified: QualifiedEntry[] = [
    ...heuristicResult.accepted,
    ...heuristicResult.borderline,
  ];
  allQualified.sort((a, b) => b.confidence - a.confidence);

  const totalQualified = allQualified.length;
  const capped = allQualified.slice(0, MAX_CANDIDATES_PER_RUN);

  // Split back into accepted vs. borderline based on threshold
  const cappedAccepted = capped.filter(e => e.confidence >= ACCEPT_THRESHOLD);
  const cappedBorderline = capped.filter(
    (e): e is QualifiedEntry & { candidate: PoolCandidate } =>
      e.confidence < ACCEPT_THRESHOLD && e.candidate !== undefined,
  );

  // ── Tier 3: AI triage on capped borderlines ──
  let aiAccepted: string[] = [];
  let aiRejected: string[] = [];
  let aiTokensUsed = 0;

  if (cappedBorderline.length > 0) {
    const triageResult = await triageBorderline(
      cappedBorderline.map(b => ({
        id: b.candidate.id,
        title: b.candidate.title,
        company: b.candidate.company,
        location: b.candidate.location,
        descriptionExcerpt: b.candidate.descriptionExcerpt,
      })),
      {
        targetRoles: profile.targetRoles,
        requiredSkills: profile.requiredSkills,
        targetLocations: profile.targetLocations,
        workEligibility: profile.workEligibility,
      },
      profile.userId,
    );
    aiAccepted = triageResult.accepted;
    aiRejected = triageResult.rejected;
    aiTokensUsed = triageResult.tokensUsed.input + triageResult.tokensUsed.output;
  }

  // ── Create Job rows for capped accepted + AI-approved candidates ──
  const jobsToCreate = [
    ...cappedAccepted.map(a => ({
      profileId,
      jobPoolId: a.id,
      feedStatus: "NEW" as const,
      matchTier: "HEURISTIC" as const,
      matchConfidence: a.confidence,
    })),
    ...aiAccepted.map(id => ({
      profileId,
      jobPoolId: id,
      feedStatus: "NEW" as const,
      matchTier: "AI_TRIAGE" as const,
      matchConfidence: 0.5,  // AI returns yes/no, not a score — 0.5 = borderline-approved
    })),
  ];

  let jobsCreated = 0;
  if (jobsToCreate.length > 0) {
    const result = await prisma.job.createMany({
      data: jobsToCreate,
      skipDuplicates: true,
    });
    jobsCreated = result.count;
  }

  // ── Persist surplus for "load more" UI ──
  // Use capped.length (attempted) instead of jobsCreated (actual) to avoid
  // inflating the count when skipDuplicates filters out already-matched jobs.
  const pendingMatchCount = Math.max(0, totalQualified - capped.length);
  await prisma.profile.update({
    where: { id: profileId },
    data: { pendingMatchCount },
  });

  return {
    candidatesFromSql: tier1Ids.length,
    acceptedByHeuristic: heuristicResult.accepted.length,
    borderlineToAi: cappedBorderline.length,
    acceptedByAi: aiAccepted.length,
    rejectedTotal: heuristicResult.rejected.length + aiRejected.length,
    aiTokensUsed,
    jobsCreated,
    totalQualified,
  };
}
