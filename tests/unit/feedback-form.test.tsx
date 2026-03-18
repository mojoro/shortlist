import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/(dashboard)/settings/feedback-actions", () => ({
  submitFeedback: vi.fn(),
}));

import { FeedbackForm } from "@/components/settings/FeedbackForm";

describe("FeedbackForm", () => {
  it("renders textarea with aria-label 'Your feedback'", () => {
    render(<FeedbackForm />);
    expect(screen.getByLabelText("Your feedback")).toBeInTheDocument();
  });

  it("renders 'Send feedback' button", () => {
    render(<FeedbackForm />);
    expect(
      screen.getByRole("button", { name: "Send feedback" }),
    ).toBeInTheDocument();
  });

  it("submit button is disabled when message is under 10 characters", async () => {
    const user = userEvent.setup();
    render(<FeedbackForm />);

    const button = screen.getByRole("button", { name: "Send feedback" });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText("Your feedback"), "Short");
    expect(button).toBeDisabled();
  });

  it("character count shows current length", async () => {
    const user = userEvent.setup();
    render(<FeedbackForm />);

    expect(screen.getByText("0/2000")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Your feedback"), "Hello");
    expect(screen.getByText("5/2000")).toBeInTheDocument();
  });
});
