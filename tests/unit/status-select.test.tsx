import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { StatusSelect } from "@/components/pipeline/StatusSelect";

describe("StatusSelect", () => {
  it("renders all 9 status options", () => {
    render(<StatusSelect value="INTERESTED" onChange={() => {}} />);
    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option"));
    const labels = options.map((o) => o.textContent);

    expect(labels).toContain("Interested");
    expect(labels).toContain("Applied");
    expect(labels).toContain("Screening");
    expect(labels).toContain("Interviewing");
    expect(labels).toContain("Offer");
    expect(labels).toContain("Accepted");
    expect(labels).toContain("Rejected");
    expect(labels).toContain("Withdrawn");
    expect(labels).toContain("Ghosted");
    expect(options).toHaveLength(9);
  });

  it("shows the current value as selected", () => {
    render(<StatusSelect value="APPLIED" onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("APPLIED");
  });

  it("calls onChange with the new status on change", async () => {
    const onChange = vi.fn();
    render(<StatusSelect value="INTERESTED" onChange={onChange} />);
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "APPLIED");
    expect(onChange).toHaveBeenCalledWith("APPLIED");
  });

  it("disables the select when disabled prop is true", () => {
    render(<StatusSelect value="INTERESTED" onChange={() => {}} disabled />);
    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
  });
});
