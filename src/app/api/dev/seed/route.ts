import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ScraperSource, LocationType, JobType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Only available when E2E_SEED is set (CI and local test runs)
export async function GET() {
  if (!process.env.E2E_SEED) {
    return NextResponse.json({ error: "Seed not enabled" }, { status: 403 });
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

  // Clean up any orphaned seed pool records from a previous run
  const SEED_EXTERNAL_IDS = [
    "greenhouse-kombo-fe-001",    "lever-taktile-fe-001",
    "ashby-cogram-fe-001",        "greenhouse-personio-fe-001",
    "lever-forto-fe-001",         "ashby-gorillas-fe-001",
    "greenhouse-sap-java-001",    "lever-zalando-ios-001",
    "ashby-moonfare-fe-001",      "greenhouse-pitch-fe-001",
    "lever-sumup-fe-001",         "ashby-meister-fe-001",
    "greenhouse-contentful-fe-001", "lever-ecosia-fe-001",
  ];
  await prisma.jobPool.deleteMany({ where: { externalId: { in: SEED_EXTERNAL_IDS } } });

  const masterResume = `# John Moorman
Software Engineer | Next.js & TypeScript Specialist
Berlin, Germany | +49 176 303 21460 | john@johnmoorman.com
johnmoorman.com | github.com/mojoro | linkedin.com/in/johnmoorman

## Professional Summary

Software Engineer and former Operatic Performer with a unique blend of disciplined performance and technical expertise. Specialize in creating scalable Next.js and TypeScript applications with a focus on process automation and AI-powered workflow automation. Expert in bridging complex UI requirements with robust DevOps infrastructure.

## Technical Skills

- **Languages:** TypeScript, JavaScript (ES6+), Python, PHP, Bash, HTML5, CSS3/SASS
- **Frameworks & Libraries:** React 19, Next.js 15, Vue.js, Nuxt, Tailwind CSS, Puppeteer
- **Backend & Database:** Node.js, REST APIs, Firebase, MongoDB, PostgreSQL
- **DevOps & Tools:** CI/CD (GitHub Actions), Docker, Linux/UNIX Shell, Vercel/Edge Deployment
- **Automation:** n8n, Apify, Google Apps Script, Agentic Workflows, Jest

## Professional Experience

### Freelance Software Engineer | Remote / Berlin
**Serenity Retreat & Various Clients** | 2025 – Present

- Delivered full-stack development and infrastructure support for a wellness retreat: built new pages, redesigned frontend, developed a custom PHP plugin to sync calendar systems, implemented analytics, and set up automated mail merges.
- Architected and deployed full-stack Next.js and Vue.js applications for multiple clients, supporting 1k+ monthly users.
- Built an AI-powered real estate data pipeline using n8n and Apify, scraping and structuring property listings for automated analysis.
- Implemented CI/CD pipelines using GitHub Actions and Docker, reducing deployment times by 30%.

### Software Engineer | Berlin, Germany
**Berlin Opera Academy** | 2023 – 2025

- Taught myself Google Apps Script from scratch to automate BOA's entire casting and student communication workflow — reducing the administrative team from 4 staff to 2 part-time, cutting an estimated €74,000/year in overhead.
- Automated student offer letters, payment tracking, and confirmation/reminder/cancellation emails via Apps Script and Google Sheets, replacing manual copy-paste processes across the full student lifecycle.
- Configured PayPal integration and built a payment reconciliation system tracking incoming payments and triggering automated follow-up emails, contributing to an 18% increase in payment collection.
- Developed a high-performance responsive website (95/100 Lighthouse score), optimised for Top-3 search rankings on key terms, raising organic traffic by 8%.

## Education

**Bachelor of Music, Vocal Performance** | Boston Conservatory at Berklee | 2017 – 2022
3.84 GPA. Studied music, languages, and anatomy; performed leading operatic roles.

## Languages

English (C2), German (B2)`;

  // Create profile
  const profile = await prisma.profile.create({
    data: {
      userId,
      name: "Software Engineer — Berlin",
      isActive: true,
      onboardingCompletedAt: new Date(),
      // Candidate identity
      displayName: "John Moorman",
      email: "john@johnmoorman.com",
      location: "Berlin, Germany",
      portfolioUrl: "https://johnmoorman.com",
      githubUrl: "https://github.com/mojoro",
      linkedinUrl: "https://linkedin.com/in/johnmoorman",
      skills: [
        "TypeScript", "JavaScript", "Python", "PHP", "Bash",
        "React", "Next.js", "Vue.js", "Nuxt", "Tailwind CSS", "Puppeteer",
        "Node.js", "REST APIs", "Firebase", "MongoDB", "PostgreSQL",
        "GitHub Actions", "Docker", "Vercel", "CI/CD",
        "n8n", "Apify", "Google Apps Script", "Jest",
        "HTML5", "CSS3",
      ],
      masterResume,
      curriculumVitae: masterResume,
      // Job search criteria
      targetRoles: ["Software Engineer", "Frontend Engineer", "Fullstack Engineer"],
      targetLocations: ["Berlin", "Remote"],
      currency: "EUR",
      targetSalaryMin: 70000,
      targetSalaryMax: 110000,
      requiredSkills: ["TypeScript", "React", "Next.js"],
      niceToHaveSkills: ["PostgreSQL", "Python", "AI/ML tooling"],
      excludedKeywords: ["10+ years", "C++", "COBOL", "Java"],
      remotePreference: "HYBRID_OK",
      scraperSources: ["GREENHOUSE", "LEVER", "ASHBY"],
    },
  });

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // Create realistic mock jobs — each creates a JobPool entry + a profile-scoped Job link
  const jobs = await prisma.$transaction([
    // Strong matches — GO
    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        aiScore: 94,
        aiStatus: "GO",
        aiSummary: "Excellent match — Kombo's stack is TypeScript + React + Next.js, exactly your core skills. Hybrid Berlin role within your salary band.",
        aiMatchPoints: ["TypeScript + React + Next.js — exact match", "Hybrid Berlin within your range", "€80–100k salary band", "Design systems experience valued"],
        aiGapPoints: ["GraphQL listed as strong plus — brush up on mutations"],
        aiAnalyzedAt: daysAgo(1),
        aiModel: "anthropic/claude-3-haiku",
        jobPool: {
          create: {
            externalId: "greenhouse-kombo-fe-001",
            source: ScraperSource.GREENHOUSE,
            url: "https://boards.greenhouse.io/kombo/jobs/1",
            title: "Senior Frontend Engineer",
            company: "Kombo",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€80,000–100,000",
            salaryMin: 80000,
            salaryMax: 100000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(1),
            description: "We're building the unified HR API. You'll own our React dashboard — component architecture, performance, accessibility. TypeScript required. Next.js a strong plus.",
            skills: ["TypeScript", "React", "Next.js", "GraphQL", "Design Systems"],
            industry: "HR Tech / API",
            companySize: "20–100",
            rawData: { source: "greenhouse", scraped: true },
          },
        },
      },
    }),

    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        aiScore: 91,
        aiStatus: "GO",
        aiSummary: "Strong match — React/TypeScript frontend role at a well-funded Berlin fintech. Salary top end slightly above your range.",
        aiMatchPoints: ["React + TypeScript frontend", "Berlin hybrid", "€85–110k — slightly above your max but achievable"],
        aiGapPoints: ["Python backend expected — you'll need basic familiarity", "Fintech domain knowledge a plus"],
        aiAnalyzedAt: daysAgo(2),
        aiModel: "anthropic/claude-3-haiku",
        jobPool: {
          create: {
            externalId: "lever-taktile-fe-001",
            source: ScraperSource.LEVER,
            url: "https://jobs.lever.co/taktile/1",
            title: "Fullstack Engineer (React / Python)",
            company: "Taktile",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€85,000–110,000",
            salaryMin: 85000,
            salaryMax: 110000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(2),
            description: "Taktile helps financial institutions automate decisions. You'll build the frontend for our decision platform using React and TypeScript. Python on the backend. Strong product sense required.",
            skills: ["TypeScript", "React", "Python", "PostgreSQL", "REST APIs"],
            industry: "Fintech / Decision Automation",
            companySize: "20–100",
            rawData: { source: "lever", scraped: true },
          },
        },
      },
    }),

    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "SAVED",
        aiScore: 88,
        aiStatus: "GO",
        aiSummary: "Good match — TypeScript/React role at an early-stage AI startup. High autonomy, within your salary range.",
        aiMatchPoints: ["TypeScript + React — core match", "Tailwind in the stack", "€75–95k within your band"],
        aiGapPoints: ["Browser extension experience not on your resume", "Startup stage means broad scope"],
        aiAnalyzedAt: daysAgo(3),
        aiModel: "anthropic/claude-3-haiku",
        jobPool: {
          create: {
            externalId: "ashby-cogram-fe-001",
            source: ScraperSource.ASHBY,
            url: "https://jobs.ashby.io/cogram/1",
            title: "Frontend Engineer",
            company: "Cogram",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€75,000–95,000",
            salaryMin: 75000,
            salaryMax: 95000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(3),
            description: "Cogram is an AI meeting assistant. You'll build the web app and browser extension in React + TypeScript. Small team, high autonomy, modern stack.",
            skills: ["TypeScript", "React", "Browser Extensions", "WebSockets", "Tailwind"],
            industry: "AI / Productivity",
            companySize: "1–20",
            rawData: { source: "ashby", scraped: true },
          },
        },
      },
    }),

    // Good matches — EXAMINE
    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        aiScore: 79,
        aiStatus: "EXAMINE",
        aiSummary: "Examine — strong salary and great company, but primary codebase is Angular, not React. TypeScript experience transfers.",
        aiMatchPoints: ["TypeScript experience transfers", "€90–120k above your target — room to negotiate", "Well-known brand for your CV"],
        aiGapPoints: ["Angular primary codebase — not your specialty", "Large enterprise culture", "Strong testing culture expected"],
        aiAnalyzedAt: daysAgo(4),
        aiModel: "anthropic/claude-3-haiku",
        jobPool: {
          create: {
            externalId: "greenhouse-personio-fe-001",
            source: ScraperSource.GREENHOUSE,
            url: "https://boards.greenhouse.io/personio/jobs/1",
            title: "Senior Frontend Engineer — HR Platform",
            company: "Personio",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€90,000–120,000",
            salaryMin: 90000,
            salaryMax: 120000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(4),
            description: "Personio is Europe's leading HR platform. Senior frontend role building complex data-heavy UIs. Angular codebase with some React teams. Strong testing culture.",
            skills: ["Angular", "TypeScript", "React", "Jest", "Cypress"],
            industry: "HR Tech / SaaS",
            companySize: "500–2000",
            rawData: { source: "greenhouse", scraped: true },
          },
        },
      },
    }),

    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        aiScore: 76,
        aiStatus: "EXAMINE",
        aiSummary: "Borderline match — good stack fit but fully onsite and salary at the bottom of your range.",
        aiMatchPoints: ["React + TypeScript — exact stack match", "Berlin-based"],
        aiGapPoints: ["Fully onsite — conflicts with your hybrid preference", "€70–85k at the low end of your target", "Logistics domain may not excite"],
        aiAnalyzedAt: daysAgo(5),
        aiModel: "anthropic/claude-3-haiku",
        jobPool: {
          create: {
            externalId: "lever-forto-fe-001",
            source: ScraperSource.LEVER,
            url: "https://jobs.lever.co/forto/1",
            title: "React Developer — Logistics Platform",
            company: "Forto",
            location: "Berlin, Germany",
            locationType: LocationType.ONSITE,
            salary: "€70,000–85,000",
            salaryMin: 70000,
            salaryMax: 85000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(5),
            description: "Forto is a digital freight forwarder. You'll build internal tools for our operations team using React and TypeScript. Fully onsite in Berlin-Mitte.",
            skills: ["React", "TypeScript", "Redux", "REST APIs", "Storybook"],
            industry: "Logistics / Supply Chain",
            companySize: "100–500",
            rawData: { source: "lever", scraped: true },
          },
        },
      },
    }),

    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        aiScore: 72,
        aiStatus: "EXAMINE",
        aiSummary: "Below target salary, and React Native web experience gaps. High traffic engineering could be compelling.",
        aiMatchPoints: ["React + TypeScript baseline match", "GraphQL experience applicable"],
        aiGapPoints: ["€65–80k below your minimum", "React Native web not on your resume", "Quick commerce may not align with interests"],
        aiAnalyzedAt: daysAgo(6),
        aiModel: "anthropic/claude-3-haiku",
        jobPool: {
          create: {
            externalId: "ashby-gorillas-fe-001",
            source: ScraperSource.ASHBY,
            url: "https://jobs.ashby.io/gorillas/1",
            title: "Frontend Engineer — Consumer App",
            company: "Gorillas",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€65,000–80,000",
            salaryMin: 65000,
            salaryMax: 80000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(6),
            description: "Join Gorillas to build the web experience for instant grocery delivery. React Native web experience a big plus. Consumer-focused, high traffic.",
            skills: ["React", "React Native", "TypeScript", "GraphQL", "High Traffic"],
            industry: "Quick Commerce",
            companySize: "500–2000",
            rawData: { source: "ashby", scraped: true },
          },
        },
      },
    }),

    // Weak matches — NO_GO
    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        aiScore: 18,
        aiStatus: "NO_GO",
        aiSummary: "No match — Java backend role, no frontend work, enterprise environment not aligned with your goals.",
        aiMatchPoints: [],
        aiGapPoints: ["Java — not your stack", "No frontend component", "Large enterprise culture", "SAP ecosystem knowledge required"],
        aiAnalyzedAt: daysAgo(7),
        aiModel: "anthropic/claude-3-haiku",
        jobPool: {
          create: {
            externalId: "greenhouse-sap-java-001",
            source: ScraperSource.GREENHOUSE,
            url: "https://boards.greenhouse.io/sap/jobs/1",
            title: "Java Backend Engineer",
            company: "SAP",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€80,000–100,000",
            salaryMin: 80000,
            salaryMax: 100000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(7),
            description: "SAP is hiring Java engineers to work on enterprise backend systems. Spring Boot, microservices, Oracle DB. Large team, structured process.",
            skills: ["Java", "Spring Boot", "Oracle", "Microservices", "SAP BTP"],
            industry: "Enterprise Software",
            companySize: "2000+",
            rawData: { source: "greenhouse", scraped: true },
          },
        },
      },
    }),

    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "ARCHIVED",
        aiScore: 12,
        aiStatus: "NO_GO",
        aiSummary: "No match — iOS/Swift role with no React or TypeScript.",
        aiMatchPoints: [],
        aiGapPoints: ["Swift/iOS — not your stack", "No web frontend component"],
        aiAnalyzedAt: daysAgo(8),
        aiModel: "anthropic/claude-3-haiku",
        jobPool: {
          create: {
            externalId: "lever-zalando-ios-001",
            source: ScraperSource.LEVER,
            url: "https://jobs.lever.co/zalando/1",
            title: "iOS Engineer — Shopping App",
            company: "Zalando",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€85,000–105,000",
            salaryMin: 85000,
            salaryMax: 105000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(8),
            description: "Zalando is looking for iOS engineers to build features in our shopping app. Swift required. Some React Native exploration. High volume, millions of users.",
            skills: ["Swift", "iOS", "Xcode", "SwiftUI", "CI/CD"],
            industry: "E-Commerce",
            companySize: "2000+",
            rawData: { source: "lever", scraped: true },
          },
        },
      },
    }),

    // Unanalyzed jobs
    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        jobPool: {
          create: {
            externalId: "ashby-moonfare-fe-001",
            source: ScraperSource.ASHBY,
            url: "https://jobs.ashby.io/moonfare/1",
            title: "Frontend Engineer — Investment Platform",
            company: "Moonfare",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€80,000–100,000",
            salaryMin: 80000,
            salaryMax: 100000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(0),
            description: "Moonfare democratises access to private equity. You'll build our investor portal — complex forms, real-time data, financial charts. TypeScript + React required.",
            skills: ["TypeScript", "React", "D3.js", "REST APIs", "Financial UX"],
            industry: "Fintech / Investment",
            companySize: "100–500",
            rawData: { source: "ashby", scraped: true },
          },
        },
      },
    }),

    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        jobPool: {
          create: {
            externalId: "greenhouse-pitch-fe-001",
            source: ScraperSource.GREENHOUSE,
            url: "https://boards.greenhouse.io/pitch/jobs/1",
            title: "Senior Product Engineer (Frontend)",
            company: "Pitch",
            location: "Berlin, Germany",
            locationType: LocationType.REMOTE,
            salary: "€90,000–120,000",
            salaryMin: 90000,
            salaryMax: 120000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(0),
            description: "Pitch is building the next generation presentation tool. You'll work on the real-time collaborative canvas — a technically challenging product loved by design teams worldwide.",
            skills: ["TypeScript", "React", "Canvas API", "WebSockets", "CRDTs"],
            industry: "Productivity / SaaS",
            companySize: "100–500",
            rawData: { source: "greenhouse", scraped: true },
          },
        },
      },
    }),

    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        jobPool: {
          create: {
            externalId: "lever-sumup-fe-001",
            source: ScraperSource.LEVER,
            url: "https://jobs.lever.co/sumup/1",
            title: "Frontend Engineer — Merchant Dashboard",
            company: "SumUp",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€75,000–95,000",
            salaryMin: 75000,
            salaryMax: 95000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(1),
            description: "SumUp powers millions of small businesses. You'll own the merchant analytics dashboard, making it easy for non-technical users to understand their business data.",
            skills: ["React", "TypeScript", "Recharts", "Accessibility", "i18n"],
            industry: "Fintech / Payments",
            companySize: "500–2000",
            rawData: { source: "lever", scraped: true },
          },
        },
      },
    }),

    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        jobPool: {
          create: {
            externalId: "ashby-meister-fe-001",
            source: ScraperSource.ASHBY,
            url: "https://jobs.ashby.io/meistertask/1",
            title: "React Frontend Developer",
            company: "MeisterTask",
            location: "Munich, Germany (Remote OK)",
            locationType: LocationType.HYBRID,
            salary: "€65,000–85,000",
            salaryMin: 65000,
            salaryMax: 85000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(2),
            description: "MeisterTask is a task management tool for teams. You'll build features in our React web app, with a focus on performance and smooth UX.",
            skills: ["React", "TypeScript", "Jest", "Storybook", "CSS Modules"],
            industry: "Productivity / SaaS",
            companySize: "20–100",
            rawData: { source: "ashby", scraped: true },
          },
        },
      },
    }),

    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        jobPool: {
          create: {
            externalId: "greenhouse-contentful-fe-001",
            source: ScraperSource.GREENHOUSE,
            url: "https://boards.greenhouse.io/contentful/jobs/1",
            title: "Senior Software Engineer — Frontend Platform",
            company: "Contentful",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€100,000–130,000",
            salaryMin: 100000,
            salaryMax: 130000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(3),
            description: "Contentful is the content platform for digital teams. This frontend platform role means building developer tooling, the component library, and performance infrastructure used by all product teams.",
            skills: ["TypeScript", "React", "Webpack", "Nx", "Design Systems", "Web Performance"],
            industry: "CMS / Developer Tools",
            companySize: "500–2000",
            rawData: { source: "greenhouse", scraped: true },
          },
        },
      },
    }),

    prisma.job.create({
      data: {
        profile: { connect: { id: profile.id } },
        feedStatus: "NEW",
        jobPool: {
          create: {
            externalId: "lever-ecosia-fe-001",
            source: ScraperSource.LEVER,
            url: "https://jobs.lever.co/ecosia/1",
            title: "Frontend Engineer — Search & Browser",
            company: "Ecosia",
            location: "Berlin, Germany",
            locationType: LocationType.HYBRID,
            salary: "€72,000–92,000",
            salaryMin: 72000,
            salaryMax: 92000,
            currency: "EUR",
            jobType: JobType.FULL_TIME,
            postedAt: daysAgo(5),
            description: "Ecosia is the search engine that plants trees. You'll work on the search results page and browser extension. Impact-driven team, B Corp certified.",
            skills: ["TypeScript", "React", "Browser Extensions", "Performance", "A/B Testing"],
            industry: "Search / Climate Tech",
            companySize: "100–500",
            rawData: { source: "lever", scraped: true },
          },
        },
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

  response.cookies.set("shortlist-onboarded", "true", { path: "/" });
  response.cookies.set("shortlist-active-profile", profile.id, { path: "/" });

  return response;
}
