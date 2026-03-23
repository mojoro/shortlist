-- CreateEnum
CREATE TYPE "MatchTier" AS ENUM ('HEURISTIC', 'AI_TRIAGE');

-- AlterTable
ALTER TABLE "job_pool" ADD COLUMN     "country" TEXT,
ADD COLUMN     "region" TEXT;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "matchConfidence" DOUBLE PRECISION,
ADD COLUMN     "matchTier" "MatchTier";

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "workEligibility" TEXT[];

-- AlterTable
ALTER TABLE "usage" ADD COLUMN     "triageCallCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "triageInputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "triageOutputTokens" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "match_runs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "candidatesFromSql" INTEGER NOT NULL DEFAULT 0,
    "acceptedByHeuristic" INTEGER NOT NULL DEFAULT 0,
    "borderlineToAi" INTEGER NOT NULL DEFAULT 0,
    "acceptedByAi" INTEGER NOT NULL DEFAULT 0,
    "rejectedTotal" INTEGER NOT NULL DEFAULT 0,
    "aiTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "match_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_runs_profileId_createdAt_idx" ON "match_runs"("profileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "job_pool_country_idx" ON "job_pool"("country");

-- AddForeignKey
ALTER TABLE "match_runs" ADD CONSTRAINT "match_runs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

