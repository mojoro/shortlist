-- CreateTable
CREATE TABLE "deleted_user_usage" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "analysisCallCount" INTEGER NOT NULL DEFAULT 0,
    "tailorCallCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "deleted_user_usage_pkey" PRIMARY KEY ("id")
);
