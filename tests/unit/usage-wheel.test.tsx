import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UsageWheel } from "@/components/ui/UsageWheel";

describe("UsageWheel", () => {
  it("renders the percentage number inside the wheel", () => {
    render(<UsageWheel percentage={72} />);
    expect(screen.getByText("72")).toBeInTheDocument();
  });

  it("uses accent color when above 30% remaining", () => {
    const { container } = render(<UsageWheel percentage={50} />);
    const fill = container.querySelector("circle:last-of-type");
    expect(fill?.getAttribute("class")).toContain("stroke-[var(--accent)]");
  });

  it("uses amber color when between 10-30% remaining", () => {
    const { container } = render(<UsageWheel percentage={20} />);
    const fill = container.querySelector("circle:last-of-type");
    expect(fill?.getAttribute("class")).toContain("stroke-amber-500");
  });

  it("uses red color when below 10% remaining", () => {
    const { container } = render(<UsageWheel percentage={5} />);
    const fill = container.querySelector("circle:last-of-type");
    expect(fill?.getAttribute("class")).toContain("stroke-red-500");
  });

  it("clamps percentage to 0-100 range", () => {
    render(<UsageWheel percentage={150} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("handles 0% edge case", () => {
    render(<UsageWheel percentage={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    const { container } = render(<UsageWheel percentage={0} />);
    const fill = container.querySelector("circle:last-of-type");
    expect(fill?.getAttribute("class")).toContain("stroke-red-500");
  });

  it("hides label when showLabel is false", () => {
    render(<UsageWheel percentage={50} showLabel={false} />);
    expect(screen.queryByText("50")).not.toBeInTheDocument();
  });
});
