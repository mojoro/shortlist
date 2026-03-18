import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ViewToggle } from "@/components/pipeline/ViewToggle";

describe("ViewToggle", () => {
  it("renders table and board toggle buttons", () => {
    render(<ViewToggle view="table" onViewChange={() => {}} />);
    expect(screen.getByLabelText("Table view")).toBeInTheDocument();
    expect(screen.getByLabelText("Board view")).toBeInTheDocument();
  });

  it("calls onViewChange with 'board' when board button clicked", async () => {
    const onChange = vi.fn();
    render(<ViewToggle view="table" onViewChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Board view"));
    expect(onChange).toHaveBeenCalledWith("board");
  });

  it("calls onViewChange with 'table' when table button clicked", async () => {
    const onChange = vi.fn();
    render(<ViewToggle view="board" onViewChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Table view"));
    expect(onChange).toHaveBeenCalledWith("table");
  });
});
