import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk",
  "/api/scrape",           // protected by CRON_SECRET instead
  "/api/analyze",          // protected by CRON_SECRET instead
  "/api/dev/(.*)",         // dev routes — protected by CRON_SECRET
  "/api/check-onboarding", // internal — called by this middleware; Clerk validates session
]);

export default clerkMiddleware(async (auth, req) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[middleware] ${req.method} ${req.nextUrl.pathname}`);
  }

  if (isPublicRoute(req)) return NextResponse.next();

  const { userId } = await auth();
  if (!userId) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[middleware] Unauthenticated — redirecting to sign-in from: ${req.nextUrl.pathname}`);
    }
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect incomplete onboarding (checked via cookie set on wizard completion).
  // When the cookie is absent (new device, cleared browser, expired), fall back to a
  // single DB check via /api/check-onboarding — a lightweight internal route that uses
  // Prisma and returns { onboarded: boolean }. If the DB confirms the user has a
  // completed profile, the cookie is written on the response so subsequent requests
  // skip this path entirely (one-time cost per session/device, not per request).
  const onboarded = req.cookies.get("shortlist-onboarded")?.value;
  const isOnboardingRoute = req.nextUrl.pathname.startsWith("/onboarding");

  if (process.env.NODE_ENV === "development") {
    console.log(`[middleware] userId: ${userId}, onboarded: ${!!onboarded}, isOnboardingRoute: ${isOnboardingRoute}, path: ${req.nextUrl.pathname}`);
  }

  if (!onboarded && !isOnboardingRoute) {
    // Cookie is missing — check DB to avoid trapping users on new devices.
    // Prisma cannot run in Edge Runtime, so we call a thin internal API route.
    try {
      const checkUrl = new URL("/api/check-onboarding", req.url);
      const checkRes = await fetch(checkUrl.toString(), {
        headers: {
          // Forward the Cookie header so Clerk can validate the session inside
          // the API route (the user's Clerk session token lives in a cookie).
          cookie: req.headers.get("cookie") ?? "",
        },
      });

      if (checkRes.ok) {
        const { onboarded: dbOnboarded } = (await checkRes.json()) as { onboarded: boolean };

        if (dbOnboarded) {
          // User has completed onboarding — restore the cookie and proceed.
          if (process.env.NODE_ENV === "development") {
            console.log(`[middleware] DB confirms onboarded — setting cookie and proceeding for: ${req.nextUrl.pathname}`);
          }
          const response = NextResponse.next();
          response.cookies.set("shortlist-onboarded", "true", { path: "/" });
          return response;
        }
      }
    } catch (err) {
      // Network error calling the internal route — fail closed: redirect to /onboarding.
      // Safe: once the user completes onboarding the cookie will be set and this path
      // won't be hit again.
      if (process.env.NODE_ENV === "development") {
        console.error("[middleware] check-onboarding fetch failed:", err);
      }
    }

    // DB check confirmed not onboarded (or fetch failed) — redirect to wizard.
    if (process.env.NODE_ENV === "development") {
      console.log(`[middleware] Not onboarded — redirecting to /onboarding from: ${req.nextUrl.pathname}`);
    }
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
