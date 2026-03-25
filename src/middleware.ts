import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk",
  "/api/scrape",           // protected by CRON_SECRET instead
  "/api/analyze",          // protected by CRON_SECRET instead
  "/api/dev/(.*)",         // dev routes — protected by CRON_SECRET
  "/api/check-onboarding", // internal — called by this middleware; Clerk validates session
  "/api/check-disabled",   // internal — called by this middleware; Clerk validates session
  "/api/track-activity",   // internal — called by this middleware; Clerk validates session
  "/disabled",
]);

const EXTENSION_CORS_PATHS = ["/api/extension/", "/api/jobs/"];

function needsExtensionCors(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin?.startsWith("chrome-extension://")) return null;
  const path = req.nextUrl.pathname;
  if (EXTENSION_CORS_PATHS.some((p) => path.startsWith(p))) return origin;
  return null;
}

function withCorsHeaders(response: NextResponse, origin: string): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return response;
}

export default clerkMiddleware(async (auth, req) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[middleware] ${req.method} ${req.nextUrl.pathname}`);
  }

  const corsOrigin = needsExtensionCors(req);

  if (corsOrigin && req.method === "OPTIONS") {
    return withCorsHeaders(new NextResponse(null, { status: 204 }), corsOrigin);
  }

  if (isPublicRoute(req)) return NextResponse.next();

  const { userId } = await auth();
  if (!userId) {
    if (corsOrigin) {
      return withCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        corsOrigin,
      );
    }
    if (process.env.NODE_ENV === "development") {
      console.log(`[middleware] Unauthenticated — redirecting to sign-in from: ${req.nextUrl.pathname}`);
    }
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Admin route guard — only the configured admin user can access /admin routes.
  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (userId !== process.env.ADMIN_USER_ID) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    // Admin skips onboarding check — fall through to response
    return NextResponse.next();
  }

  // The shortlist-active cookie (5min TTL) debounces both the disabled check and
  // the lastActiveAt tracking — avoids hitting these internal routes on every request.
  const activeCheck = req.cookies.get("shortlist-active")?.value;

  // Disabled user check (debounced via cookie)
  if (!activeCheck && !req.nextUrl.pathname.startsWith("/onboarding")) {
    try {
      const checkUrl = new URL("/api/check-disabled", req.url);
      const checkRes = await fetch(checkUrl.toString(), {
        headers: { cookie: req.headers.get("cookie") ?? "" },
      });
      if (checkRes.ok) {
        const { disabled } = (await checkRes.json()) as { disabled: boolean };
        if (disabled) {
          return NextResponse.redirect(new URL("/disabled", req.url));
        }
      }
    } catch {
      // Fail open — don't block users if check fails
    }
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

  if (!onboarded && !isOnboardingRoute && !corsOrigin) {
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
          response.cookies.set("shortlist-onboarded", "true", {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
          });
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

  const response = NextResponse.next();
  if (!activeCheck) {
    response.cookies.set("shortlist-active", "true", {
      path: "/",
      maxAge: 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    // Fire-and-forget activity tracking
    const trackUrl = new URL("/api/track-activity", req.url);
    fetch(trackUrl.toString(), {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    }).catch(() => {});
  }
  if (corsOrigin) withCorsHeaders(response, corsOrigin);
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
