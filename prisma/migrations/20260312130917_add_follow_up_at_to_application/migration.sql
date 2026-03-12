-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "followUpAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "applications_profileId_followUpAt_idx" ON "applications"("profileId", "followUpAt");
