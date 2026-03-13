-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "jobPoolId" TEXT;

-- AlterTable
ALTER TABLE "scrape_runs" ADD COLUMN     "jobsInPool" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "profileId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "job_pool" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" "ScraperSource" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "rawData" JSONB,

    CONSTRAINT "job_pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_pool_source_createdAt_idx" ON "job_pool"("source", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "job_pool_source_externalId_key" ON "job_pool"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_profileId_jobPoolId_key" ON "jobs"("profileId", "jobPoolId");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_jobPoolId_fkey" FOREIGN KEY ("jobPoolId") REFERENCES "job_pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
