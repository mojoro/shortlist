import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk",
  "/api/scrape",
  "/api/analyze",
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

  // Redirect incomplete onboarding (checked via cookie set on wizard completion)
  const onboarded = req.cookies.get("shortlist-onboarded")?.value;
  const isOnboardingRoute = req.nextUrl.pathname.startsWith("/onboarding");

  if (process.env.NODE_ENV === "development") {
    console.log(`[middleware] userId: ${userId}, onboarded: ${!!onboarded}, isOnboardingRoute: ${isOnboardingRoute}, path: ${req.nextUrl.pathname}`);
  }

  if (!onboarded && !isOnboardingRoute) {
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
