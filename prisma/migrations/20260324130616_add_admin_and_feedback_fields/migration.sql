-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "lastActiveAt" TIMESTAMP(3);
