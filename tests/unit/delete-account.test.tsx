import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/(dashboard)/settings/delete-account-actions", () => ({
  deleteAccount: vi.fn(),
}));

vi.mock("@/config/app", () => ({
  APP_CONFIG: { name: "Shortlist" },
}));

import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";

describe("DeleteAccountSection", () => {
  it("renders 'Danger zone' heading", () => {
    render(<DeleteAccountSection />);
    expect(
      screen.getByRole("heading", { name: "Danger zone" }),
    ).toBeInTheDocument();
  });

  it("renders 'Delete account' button", () => {
    render(<DeleteAccountSection />);
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeInTheDocument();
  });

  it("does NOT render the confirmation dialog by default", () => {
    render(<DeleteAccountSection />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
