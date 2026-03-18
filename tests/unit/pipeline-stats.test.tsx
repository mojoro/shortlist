import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PipelineStats } from "@/components/pipeline/PipelineStats";

describe("PipelineStats", () => {
  it("renders all four stat cards with correct values", () => {
    render(
      <PipelineStats
        activeCount={10}
        appliedCount={4}
        interviewingCount={2}
        offerCount={1}
      />,
    );

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Interviewing")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Offers")).toBeInTheDocument();
  });

  it("renders zero counts correctly", () => {
    render(
      <PipelineStats
        activeCount={0}
        appliedCount={0}
        interviewingCount={0}
        offerCount={0}
      />,
    );

    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(4);
  });
});
