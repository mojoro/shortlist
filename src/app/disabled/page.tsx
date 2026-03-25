import { SignOutButton } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account Suspended" };

export default function DisabledPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-3 text-2xl font-semibold text-[var(--text)]">
          Account Suspended
        </h1>
        <p className="mb-6 text-[var(--text-muted)]">
          Your account has been suspended. Contact the administrator for help.
        </p>
        <SignOutButton>
          <button className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:opacity-90">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
