import type { Metadata } from "next";
import { APP_CONFIG } from "@/config/app";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: `Get started — ${APP_CONFIG.name}`,
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
