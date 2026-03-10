import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Only available in development
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Upsert user record
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });

  // Delete existing seed data for this user to allow re-seeding
  const existingProfiles = await prisma.profile.findMany({ where: { userId } });
  if (existingProfiles.length > 0) {
    await prisma.profile.deleteMany({ where: { userId } });
  }

  // Create profile
  const profile = await prisma.profile.create({
    data: {
      userId,
      name: "Frontend Engineer — Berlin",
      isActive: true,
      onboardingCompletedAt: new Date(),
      targetRoles: ["Frontend Engineer", "Fullstack Engineer", "React Developer"],
      targetLocations: ["Berlin", "Remote"],
      currency: "EUR",
      targetSalaryMin: 70000,
      targetSalaryMax: 110000,
      requiredSkills: ["TypeScript", "React", "Next.js"],
      niceToHaveSkills: ["GraphQL", "PostgreSQL", "AWS"],
      excludedKeywords: ["10+ years", "C++", "COBOL"],
      remotePreference: "HYBRID_OK",
      scraperSources: ["GREENHOUSE", "LEVER", "ASHBY"],
      masterResume: `# Jane Doe\njane@example.com · Berlin, Germany · github.com/janedoe\n\n## Summary\nFrontend engineer with 5 years building React applications at scale. Strong TypeScript and Next.js background. Passionate about developer experience and accessible interfaces.\n\n## Experience\n\n### Senior Frontend Engineer — Acme Corp (2022–present)\n- Led migration from CRA to Next.js 14, cutting build times by 60%\n- Built design system used across 4 product teams\n- Mentored 3 junior engineers\n\n### Frontend Engineer — Beta Co (2019–2022)\n- Owned the customer-facing dashboard (React, Redux, REST)\n- Reduced bundle size by 40% through code splitting\n\n## Skills\nTypeScript, React, Next.js, Node.js, PostgreSQL, GraphQL, Tailwind CSS, Figma\n\n## Education\nB.Sc. Computer Science — TU Berlin, 2019`,
    },
  });

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // Create realistic mock jobs
  const jobs = await prisma.$transaction([
    // Strong matches — GO
    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "greenhouse-kombo-fe-001",
        source: "GREENHOUSE",
        url: "https://boards.greenhouse.io/kombo/jobs/1",
        title: "Senior Frontend Engineer",
        company: "Kombo",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€80,000–100,000",
        salaryMin: 80000,
        salaryMax: 100000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(1),
        description: "We're building the unified HR API. You'll own our React dashboard — component architecture, performance, accessibility. TypeScript required. Next.js a strong plus.",
        skills: ["TypeScript", "React", "Next.js", "GraphQL", "Design Systems"],
        industry: "HR Tech / API",
        companySize: "20–100",
        aiScore: 94,
        aiStatus: "GO",
        aiSummary: "Excellent match — Kombo's stack is TypeScript + React + Next.js, exactly your core skills. Hybrid Berlin role within your salary band.",
        aiMatchPoints: ["TypeScript + React + Next.js — exact match", "Hybrid Berlin within your range", "€80–100k salary band", "Design systems experience valued"],
        aiGapPoints: ["GraphQL listed as strong plus — brush up on mutations"],
        aiAnalyzedAt: daysAgo(1),
        aiModel: "anthropic/claude-sonnet-4-6",
        feedStatus: "NEW",
        rawData: { source: "greenhouse", scraped: true },
      },
    }),

    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "lever-taktile-fe-001",
        source: "LEVER",
        url: "https://jobs.lever.co/taktile/1",
        title: "Fullstack Engineer (React / Python)",
        company: "Taktile",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€85,000–110,000",
        salaryMin: 85000,
        salaryMax: 110000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(2),
        description: "Taktile helps financial institutions automate decisions. You'll build the frontend for our decision platform using React and TypeScript. Python on the backend. Strong product sense required.",
        skills: ["TypeScript", "React", "Python", "PostgreSQL", "REST APIs"],
        industry: "Fintech / Decision Automation",
        companySize: "20–100",
        aiScore: 91,
        aiStatus: "GO",
        aiSummary: "Strong match — React/TypeScript frontend role at a well-funded Berlin fintech. Salary top end slightly above your range.",
        aiMatchPoints: ["React + TypeScript frontend", "Berlin hybrid", "€85–110k — slightly above your max but achievable"],
        aiGapPoints: ["Python backend expected — you'll need basic familiarity", "Fintech domain knowledge a plus"],
        aiAnalyzedAt: daysAgo(2),
        aiModel: "anthropic/claude-sonnet-4-6",
        feedStatus: "NEW",
        rawData: { source: "lever", scraped: true },
      },
    }),

    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "ashby-cogram-fe-001",
        source: "ASHBY",
        url: "https://jobs.ashby.io/cogram/1",
        title: "Frontend Engineer",
        company: "Cogram",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€75,000–95,000",
        salaryMin: 75000,
        salaryMax: 95000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(3),
        description: "Cogram is an AI meeting assistant. You'll build the web app and browser extension in React + TypeScript. Small team, high autonomy, modern stack.",
        skills: ["TypeScript", "React", "Browser Extensions", "WebSockets", "Tailwind"],
        industry: "AI / Productivity",
        companySize: "1–20",
        aiScore: 88,
        aiStatus: "GO",
        aiSummary: "Good match — TypeScript/React role at an early-stage AI startup. High autonomy, within your salary range.",
        aiMatchPoints: ["TypeScript + React — core match", "Tailwind in the stack", "€75–95k within your band"],
        aiGapPoints: ["Browser extension experience not on your resume", "Startup stage means broad scope"],
        aiAnalyzedAt: daysAgo(3),
        aiModel: "anthropic/claude-sonnet-4-6",
        feedStatus: "SAVED",
        rawData: { source: "ashby", scraped: true },
      },
    }),

    // Good matches — EXAMINE
    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "greenhouse-personio-fe-001",
        source: "GREENHOUSE",
        url: "https://boards.greenhouse.io/personio/jobs/1",
        title: "Senior Frontend Engineer — HR Platform",
        company: "Personio",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€90,000–120,000",
        salaryMin: 90000,
        salaryMax: 120000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(4),
        description: "Personio is Europe's leading HR platform. Senior frontend role building complex data-heavy UIs. Angular codebase with some React teams. Strong testing culture.",
        skills: ["Angular", "TypeScript", "React", "Jest", "Cypress"],
        industry: "HR Tech / SaaS",
        companySize: "500–2000",
        aiScore: 79,
        aiStatus: "EXAMINE",
        aiSummary: "Examine — strong salary and great company, but primary codebase is Angular, not React. TypeScript experience transfers.",
        aiMatchPoints: ["TypeScript experience transfers", "€90–120k above your target — room to negotiate", "Well-known brand for your CV"],
        aiGapPoints: ["Angular primary codebase — not your specialty", "Large enterprise culture", "Strong testing culture expected"],
        aiAnalyzedAt: daysAgo(4),
        aiModel: "anthropic/claude-sonnet-4-6",
        feedStatus: "NEW",
        rawData: { source: "greenhouse", scraped: true },
      },
    }),

    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "lever-forto-fe-001",
        source: "LEVER",
        url: "https://jobs.lever.co/forto/1",
        title: "React Developer — Logistics Platform",
        company: "Forto",
        location: "Berlin, Germany",
        locationType: "ONSITE",
        salary: "€70,000–85,000",
        salaryMin: 70000,
        salaryMax: 85000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(5),
        description: "Forto is a digital freight forwarder. You'll build internal tools for our operations team using React and TypeScript. Fully onsite in Berlin-Mitte.",
        skills: ["React", "TypeScript", "Redux", "REST APIs", "Storybook"],
        industry: "Logistics / Supply Chain",
        companySize: "100–500",
        aiScore: 76,
        aiStatus: "EXAMINE",
        aiSummary: "Borderline match — good stack fit but fully onsite and salary at the bottom of your range.",
        aiMatchPoints: ["React + TypeScript — exact stack match", "Berlin-based"],
        aiGapPoints: ["Fully onsite — conflicts with your hybrid preference", "€70–85k at the low end of your target", "Logistics domain may not excite"],
        aiAnalyzedAt: daysAgo(5),
        aiModel: "anthropic/claude-sonnet-4-6",
        feedStatus: "NEW",
        rawData: { source: "lever", scraped: true },
      },
    }),

    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "ashby-gorillas-fe-001",
        source: "ASHBY",
        url: "https://jobs.ashby.io/gorillas/1",
        title: "Frontend Engineer — Consumer App",
        company: "Gorillas",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€65,000–80,000",
        salaryMin: 65000,
        salaryMax: 80000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(6),
        description: "Join Gorillas to build the web experience for instant grocery delivery. React Native web experience a big plus. Consumer-focused, high traffic.",
        skills: ["React", "React Native", "TypeScript", "GraphQL", "High Traffic"],
        industry: "Quick Commerce",
        companySize: "500–2000",
        aiScore: 72,
        aiStatus: "EXAMINE",
        aiSummary: "Below target salary, and React Native web experience gaps. High traffic engineering could be compelling.",
        aiMatchPoints: ["React + TypeScript baseline match", "GraphQL experience applicable"],
        aiGapPoints: ["€65–80k below your minimum", "React Native web not on your resume", "Quick commerce may not align with interests"],
        aiAnalyzedAt: daysAgo(6),
        aiModel: "anthropic/claude-sonnet-4-6",
        feedStatus: "NEW",
        rawData: { source: "ashby", scraped: true },
      },
    }),

    // Weak matches — NO_GO
    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "greenhouse-sap-java-001",
        source: "GREENHOUSE",
        url: "https://boards.greenhouse.io/sap/jobs/1",
        title: "Java Backend Engineer",
        company: "SAP",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€80,000–100,000",
        salaryMin: 80000,
        salaryMax: 100000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(7),
        description: "SAP is hiring Java engineers to work on enterprise backend systems. Spring Boot, microservices, Oracle DB. Large team, structured process.",
        skills: ["Java", "Spring Boot", "Oracle", "Microservices", "SAP BTP"],
        industry: "Enterprise Software",
        companySize: "2000+",
        aiScore: 18,
        aiStatus: "NO_GO",
        aiSummary: "No match — Java backend role, no frontend work, enterprise environment not aligned with your goals.",
        aiMatchPoints: [],
        aiGapPoints: ["Java — not your stack", "No frontend component", "Large enterprise culture", "SAP ecosystem knowledge required"],
        aiAnalyzedAt: daysAgo(7),
        aiModel: "anthropic/claude-sonnet-4-6",
        feedStatus: "NEW",
        rawData: { source: "greenhouse", scraped: true },
      },
    }),

    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "lever-zalando-ios-001",
        source: "LEVER",
        url: "https://jobs.lever.co/zalando/1",
        title: "iOS Engineer — Shopping App",
        company: "Zalando",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€85,000–105,000",
        salaryMin: 85000,
        salaryMax: 105000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(8),
        description: "Zalando is looking for iOS engineers to build features in our shopping app. Swift required. Some React Native exploration. High volume, millions of users.",
        skills: ["Swift", "iOS", "Xcode", "SwiftUI", "CI/CD"],
        industry: "E-Commerce",
        companySize: "2000+",
        aiScore: 12,
        aiStatus: "NO_GO",
        aiSummary: "No match — iOS/Swift role with no React or TypeScript.",
        aiMatchPoints: [],
        aiGapPoints: ["Swift/iOS — not your stack", "No web frontend component"],
        aiAnalyzedAt: daysAgo(8),
        aiModel: "anthropic/claude-sonnet-4-6",
        feedStatus: "ARCHIVED",
        rawData: { source: "lever", scraped: true },
      },
    }),

    // Unanalyzed jobs
    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "ashby-moonfare-fe-001",
        source: "ASHBY",
        url: "https://jobs.ashby.io/moonfare/1",
        title: "Frontend Engineer — Investment Platform",
        company: "Moonfare",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€80,000–100,000",
        salaryMin: 80000,
        salaryMax: 100000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(0),
        description: "Moonfare democratises access to private equity. You'll build our investor portal — complex forms, real-time data, financial charts. TypeScript + React required.",
        skills: ["TypeScript", "React", "D3.js", "REST APIs", "Financial UX"],
        industry: "Fintech / Investment",
        companySize: "100–500",
        feedStatus: "NEW",
        rawData: { source: "ashby", scraped: true },
      },
    }),

    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "greenhouse-pitch-fe-001",
        source: "GREENHOUSE",
        url: "https://boards.greenhouse.io/pitch/jobs/1",
        title: "Senior Product Engineer (Frontend)",
        company: "Pitch",
        location: "Berlin, Germany",
        locationType: "REMOTE",
        salary: "€90,000–120,000",
        salaryMin: 90000,
        salaryMax: 120000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(0),
        description: "Pitch is building the next generation presentation tool. You'll work on the real-time collaborative canvas — a technically challenging product loved by design teams worldwide.",
        skills: ["TypeScript", "React", "Canvas API", "WebSockets", "CRDTs"],
        industry: "Productivity / SaaS",
        companySize: "100–500",
        feedStatus: "NEW",
        rawData: { source: "greenhouse", scraped: true },
      },
    }),

    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "lever-sumup-fe-001",
        source: "LEVER",
        url: "https://jobs.lever.co/sumup/1",
        title: "Frontend Engineer — Merchant Dashboard",
        company: "SumUp",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€75,000–95,000",
        salaryMin: 75000,
        salaryMax: 95000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(1),
        description: "SumUp powers millions of small businesses. You'll own the merchant analytics dashboard, making it easy for non-technical users to understand their business data.",
        skills: ["React", "TypeScript", "Recharts", "Accessibility", "i18n"],
        industry: "Fintech / Payments",
        companySize: "500–2000",
        feedStatus: "NEW",
        rawData: { source: "lever", scraped: true },
      },
    }),

    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "ashby-meister-fe-001",
        source: "ASHBY",
        url: "https://jobs.ashby.io/meistertask/1",
        title: "React Frontend Developer",
        company: "MeisterTask",
        location: "Munich, Germany (Remote OK)",
        locationType: "HYBRID",
        salary: "€65,000–85,000",
        salaryMin: 65000,
        salaryMax: 85000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(2),
        description: "MeisterTask is a task management tool for teams. You'll build features in our React web app, with a focus on performance and smooth UX.",
        skills: ["React", "TypeScript", "Jest", "Storybook", "CSS Modules"],
        industry: "Productivity / SaaS",
        companySize: "20–100",
        feedStatus: "NEW",
        rawData: { source: "ashby", scraped: true },
      },
    }),

    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "greenhouse-contentful-fe-001",
        source: "GREENHOUSE",
        url: "https://boards.greenhouse.io/contentful/jobs/1",
        title: "Senior Software Engineer — Frontend Platform",
        company: "Contentful",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€100,000–130,000",
        salaryMin: 100000,
        salaryMax: 130000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(3),
        description: "Contentful is the content platform for digital teams. This frontend platform role means building developer tooling, the component library, and performance infrastructure used by all product teams.",
        skills: ["TypeScript", "React", "Webpack", "Nx", "Design Systems", "Web Performance"],
        industry: "CMS / Developer Tools",
        companySize: "500–2000",
        feedStatus: "NEW",
        rawData: { source: "greenhouse", scraped: true },
      },
    }),

    prisma.job.create({
      data: {
        profileId: profile.id,
        externalId: "lever-ecosia-fe-001",
        source: "LEVER",
        url: "https://jobs.lever.co/ecosia/1",
        title: "Frontend Engineer — Search & Browser",
        company: "Ecosia",
        location: "Berlin, Germany",
        locationType: "HYBRID",
        salary: "€72,000–92,000",
        salaryMin: 72000,
        salaryMax: 92000,
        currency: "EUR",
        jobType: "FULL_TIME",
        postedAt: daysAgo(5),
        description: "Ecosia is the search engine that plants trees. You'll work on the search results page and browser extension. Impact-driven team, B Corp certified.",
        skills: ["TypeScript", "React", "Browser Extensions", "Performance", "A/B Testing"],
        industry: "Search / Climate Tech",
        companySize: "100–500",
        feedStatus: "NEW",
        rawData: { source: "lever", scraped: true },
      },
    }),
  ]);

  // Create one application (Kombo job — INTERESTED stage)
  const komboJob = jobs[0];
  await prisma.application.create({
    data: {
      profileId: profile.id,
      jobId: komboJob.id,
      status: "INTERESTED",
      statusUpdatedAt: new Date(),
      notes: "Reach out to engineering contact on LinkedIn first",
    },
  });

  // Create one applied application (Cogram job)
  const cogramJob = jobs[2];
  await prisma.application.create({
    data: {
      profileId: profile.id,
      jobId: cogramJob.id,
      status: "APPLIED",
      statusUpdatedAt: daysAgo(1),
      appliedAt: daysAgo(1),
    },
  });

  // Set the onboarding cookie via response header so middleware passes
  const response = NextResponse.json({
    ok: true,
    message: `Seeded ${jobs.length} jobs for profile "${profile.name}"`,
    profileId: profile.id,
    next: "Go to /dashboard to see your feed",
  });

  response.cookies.set("shortlist-onboarded", "1", { path: "/" });
  response.cookies.set("shortlist-active-profile", profile.id, { path: "/" });

  return response;
}
