import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import path from "path";

setup.describe.configure({ mode: "serial" });

setup("configure Clerk testing", async ({}) => {
  await clerkSetup();
});

const authFile = path.join(__dirname, "../playwright/.clerk/user.json");

setup("authenticate and save state", async ({ page }) => {
  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: process.env.E2E_CLERK_USER_USERNAME!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    },
  });

  // The middleware checks a "shortlist-onboarded" cookie before allowing /dashboard.
  // Set it directly so the middleware skips the /api/check-onboarding fetch.
  await page.context().addCookies([
    {
      name: "shortlist-onboarded",
      value: "1",
      domain: "localhost",
      path: "/",
    },
  ]);

  // Verify we can reach the dashboard
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle", { timeout: 30_000 });

  await page.context().storageState({ path: authFile });
});
