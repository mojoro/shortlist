-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_jobPoolId_fkey";

-- DropIndex
DROP INDEX "jobs_profileId_externalId_key";

-- DropIndex
DROP INDEX "jobs_profileId_postedAt_idx";

-- AlterTable
ALTER TABLE "job_pool" ADD COLUMN     "companySize" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "jobType" "JobType",
ADD COLUMN     "locationType" "LocationType",
ADD COLUMN     "salary" TEXT,
ADD COLUMN     "salaryMax" INTEGER,
ADD COLUMN     "salaryMin" INTEGER,
ADD COLUMN     "skills" TEXT[] NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "company",
DROP COLUMN "companySize",
DROP COLUMN "currency",
DROP COLUMN "description",
DROP COLUMN "externalId",
DROP COLUMN "industry",
DROP COLUMN "jobType",
DROP COLUMN "location",
DROP COLUMN "locationType",
DROP COLUMN "postedAt",
DROP COLUMN "rawData",
DROP COLUMN "salary",
DROP COLUMN "salaryMax",
DROP COLUMN "salaryMin",
DROP COLUMN "skills",
DROP COLUMN "source",
DROP COLUMN "title",
DROP COLUMN "url",
ALTER COLUMN "jobPoolId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_jobPoolId_fkey" FOREIGN KEY ("jobPoolId") REFERENCES "job_pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
