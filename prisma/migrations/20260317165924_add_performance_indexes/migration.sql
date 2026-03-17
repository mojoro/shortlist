-- AlterTable
ALTER TABLE "usage" ALTER COLUMN "monthlyLimitInputTokens" SET DEFAULT 100000;

-- CreateIndex
CREATE INDEX "jobs_profileId_feedStatus_aiScore_idx" ON "jobs"("profileId", "feedStatus", "aiScore" DESC);

-- CreateIndex
CREATE INDEX "profiles_userId_idx" ON "profiles"("userId");
