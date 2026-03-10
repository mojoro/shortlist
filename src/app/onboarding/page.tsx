import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Onboarding placeholder — sets the completion cookie and bounces to the feed.
 * Replace with the real onboarding wizard when that feature is built.
 */
export default async function OnboardingPage() {
  const cookieStore = await cookies();
  cookieStore.set("shortlist-onboarded", "1", { path: "/" });
  redirect("/dashboard");
}
