-- DropIndex
DROP INDEX "idx_job_pool_location_trgm";

-- DropIndex
DROP INDEX "idx_job_pool_title_trgm";

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "styleGuide" TEXT;
