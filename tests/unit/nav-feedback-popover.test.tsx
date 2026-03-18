import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/(dashboard)/settings/feedback-actions", () => ({
  submitFeedback: vi.fn(),
}));

import { NavFeedbackPopover } from "@/components/layout/NavFeedbackPopover";

describe("NavFeedbackPopover", () => {
  it("renders feedback button with 'Send feedback' label", () => {
    render(<NavFeedbackPopover labelClass="text-sm" />);
    expect(
      screen.getByRole("button", { name: "Send feedback" }),
    ).toBeInTheDocument();
  });
});
