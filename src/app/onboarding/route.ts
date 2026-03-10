import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Onboarding placeholder — sets the completion cookie and redirects to the feed.
 * Replace with the real onboarding wizard page when that feature is built.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.set("shortlist-onboarded", "1", { path: "/" });
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
