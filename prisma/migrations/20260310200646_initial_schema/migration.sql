-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "RemotePreference" AS ENUM ('REMOTE_ONLY', 'HYBRID_OK', 'ANY', 'ONSITE_ONLY');

-- CreateEnum
CREATE TYPE "ScraperSource" AS ENUM ('LINKEDIN', 'GREENHOUSE', 'LEVER', 'ASHBY', 'INDEED', 'BERLIN_STARTUP_JOBS', 'HONEYPOT', 'YC_JOBS', 'NO_FLUFF_JOBS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ScraperFrequency" AS ENUM ('HOURLY', 'EVERY_6H', 'DAILY', 'MANUAL');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('GO', 'NO_GO', 'EXAMINE');

-- CreateEnum
CREATE TYPE "FeedStatus" AS ENUM ('NEW', 'SAVED', 'ARCHIVED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('INTERESTED', 'APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'GHOSTED');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),
    "targetRoles" TEXT[],
    "targetLocations" TEXT[],
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "targetSalaryMin" INTEGER,
    "targetSalaryMax" INTEGER,
    "requiredSkills" TEXT[],
    "niceToHaveSkills" TEXT[],
    "excludedKeywords" TEXT[],
    "companySize" "CompanySize"[],
    "remotePreference" "RemotePreference" NOT NULL DEFAULT 'ANY',
    "masterResume" TEXT,
    "resumeLastEdited" TIMESTAMP(3),
    "scraperEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scraperSources" "ScraperSource"[],
    "scraperFrequency" "ScraperFrequency" NOT NULL DEFAULT 'DAILY',
    "lastScrapedAt" TIMESTAMP(3),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" "ScraperSource" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "locationType" "LocationType",
    "salary" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "currency" TEXT,
    "jobType" "JobType",
    "postedAt" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "skills" TEXT[],
    "companySize" TEXT,
    "industry" TEXT,
    "aiScore" INTEGER,
    "aiStatus" "AiStatus",
    "aiSummary" TEXT,
    "aiMatchPoints" TEXT[],
    "aiGapPoints" TEXT[],
    "aiAnalyzedAt" TIMESTAMP(3),
    "aiModel" TEXT,
    "feedStatus" "FeedStatus" NOT NULL DEFAULT 'NEW',
    "viewedAt" TIMESTAMP(3),
    "userNotes" TEXT,
    "rawData" JSONB,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'INTERESTED',
    "statusUpdatedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "interviewDates" TIMESTAMP(3)[],
    "offerReceivedAt" TIMESTAMP(3),
    "decisionAt" TIMESTAMP(3),
    "notes" TEXT,
    "salaryOffered" INTEGER,
    "recruiterName" TEXT,
    "recruiterEmail" TEXT,
    "exportedResumeMarkdown" TEXT,
    "exportedAt" TIMESTAMP(3),

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tailored_resumes" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "markdown" TEXT NOT NULL,
    "generatedBy" TEXT,
    "wasExported" BOOLEAN NOT NULL DEFAULT false,
    "exportedAt" TIMESTAMP(3),
    "promptSnapshot" TEXT,

    CONSTRAINT "tailored_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "analysisCallCount" INTEGER NOT NULL DEFAULT 0,
    "tailorCallCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyLimitInputTokens" INTEGER NOT NULL DEFAULT 500000,
    "currentMonthInputTokens" INTEGER NOT NULL DEFAULT 0,
    "currentMonthOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "currentMonthResetsAt" TIMESTAMP(3),

    CONSTRAINT "usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_runs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ScraperSource" NOT NULL,
    "status" "ScrapeStatus" NOT NULL,
    "jobsFound" INTEGER NOT NULL DEFAULT 0,
    "jobsNew" INTEGER NOT NULL DEFAULT 0,
    "jobsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "durationMs" INTEGER,

    CONSTRAINT "scrape_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jobs_profileId_feedStatus_idx" ON "jobs"("profileId", "feedStatus");

-- CreateIndex
CREATE INDEX "jobs_profileId_aiScore_idx" ON "jobs"("profileId", "aiScore" DESC);

-- CreateIndex
CREATE INDEX "jobs_profileId_postedAt_idx" ON "jobs"("profileId", "postedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_profileId_externalId_key" ON "jobs"("profileId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_jobId_key" ON "applications"("jobId");

-- CreateIndex
CREATE INDEX "applications_profileId_status_idx" ON "applications"("profileId", "status");

-- CreateIndex
CREATE INDEX "tailored_resumes_applicationId_idx" ON "tailored_resumes"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_userId_key" ON "usage"("userId");

-- CreateIndex
CREATE INDEX "scrape_runs_profileId_createdAt_idx" ON "scrape_runs"("profileId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
