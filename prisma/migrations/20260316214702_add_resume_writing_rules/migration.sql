-- AlterTable
ALTER TABLE "job_pool" ALTER COLUMN "skills" DROP DEFAULT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "bannedPhrases" TEXT[],
ADD COLUMN     "neverClaim" TEXT[],
ADD COLUMN     "protectedPhrases" TEXT[],
ADD COLUMN     "verifiedMetrics" TEXT[];
