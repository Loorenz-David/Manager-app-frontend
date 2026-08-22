import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ProductionTimeCard } from "./ProductionTimeCard";
import { ProductionTimeCardSkeleton } from "./ProductionTimeCardSkeleton";
import type {
  ProductionTimeRowViewModel,
  ProductionTimeViewModel,
} from "../../lib/production-time-view-model";
import {
  productionTimeEdgeCasesFixture,
  productionTimeEmptyFixture,
  productionTimeFiveStageFixture,
  productionTimeLongPipelineFixture,
  productionTimeMockupFixture,
  productionTimeNotEvaluatedFixture,
  productionTimeOverBudgetFixture,
  productionTimeUnavailableFixture,
} from "./production-time-fixtures";

afterEach(cleanup);

function fiveRowsWithLastActive(): ProductionTimeRowViewModel[] {
  if (productionTimeFiveStageFixture.kind !== "budget") {
    throw new Error("Expected the five-stage fixture to carry a budget.");
  }

  return productionTimeFiveStageFixture.card.rows.map((row, index) => ({
    ...row,
    isActive: index === 4,
  }));
}

function viewModelWithRows(
  kind: "budget" | "no_budget",
  rows: ProductionTimeRowViewModel[],
): ProductionTimeViewModel {
  if (kind === "budget") {
    if (productionTimeFiveStageFixture.kind !== "budget") {
      throw new Error("Expected the five-stage fixture to carry a budget.");
    }

    return {
      kind,
      card: { ...productionTimeFiveStageFixture.card, rows },
    };
  }

  if (productionTimeNotEvaluatedFixture.kind !== "no_budget") {
    throw new Error("Expected the not-evaluated fixture to lack a budget.");
  }

  return {
    kind,
    card: {
      ...productionTimeNotEvaluatedFixture.card,
      rows: rows.map((row) => ({ ...row, detail: null })),
    },
  };
}

describe("ProductionTimeCard — the allowance on screen", () => {
  it("shows every row its allowance, working and pending alike", () => {
    const rows = fiveRowsWithLastActive().map((row, index) => ({
      ...row,
      allowanceLabel: `${index + 1}m allowed`,
      typicalLabel: `typical ${index + 2}m`,
    }));

    render(<ProductionTimeCard viewModel={viewModelWithRows("budget", rows)} />);

    const budgetLines = screen.getAllByTestId("production-time-row-budget");
    expect(budgetLines).toHaveLength(rows.length);
    expect(budgetLines[0]).toHaveTextContent("1m allowed · typical 2m");
  });

  it("says the allowance alone when the section has no typical yet", () => {
    const rows = fiveRowsWithLastActive()
      .slice(0, 1)
      .map((row) => ({
        ...row,
        detail: null,
        isActive: false,
        allowanceLabel: "26m allowed",
        typicalLabel: null,
      }));

    render(<ProductionTimeCard viewModel={viewModelWithRows("budget", rows)} />);

    expect(screen.getByTestId("production-time-row-budget")).toHaveTextContent(
      "26m allowed",
    );
  });

  it("renders no budget line at all when the row has neither figure", () => {
    const rows = fiveRowsWithLastActive()
      .slice(0, 1)
      .map((row) => ({
        ...row,
        detail: null,
        isActive: false,
        allowanceLabel: null,
        typicalLabel: null,
      }));

    render(<ProductionTimeCard viewModel={viewModelWithRows("budget", rows)} />);

    expect(
      screen.queryByTestId("production-time-row-budget"),
    ).not.toBeInTheDocument();
  });

  it("leaves the degraded frame alone — it has no allowances to show", () => {
    // The no-budget card's rows carry a null allowance by construction, so the
    // line must not appear there. Guards the "degraded frame unchanged" rule.
    const rows = fiveRowsWithLastActive().map((row) => ({
      ...row,
      allowanceLabel: null,
      typicalLabel: null,
    }));

    render(
      <ProductionTimeCard viewModel={viewModelWithRows("no_budget", rows)} />,
    );

    expect(
      screen.queryByTestId("production-time-row-budget"),
    ).not.toBeInTheDocument();
  });
});

describe("ProductionTimeCard — budget state", () => {
  it("renders the headline, the bar and the pipeline in payload order", () => {
    render(<ProductionTimeCard viewModel={productionTimeMockupFixture} />);

    expect(screen.getByTestId("production-time-headline-worked")).toHaveTextContent(
      "2h 55m",
    );
    expect(screen.getByTestId("production-time-headline-budget")).toHaveTextContent(
      "of 3h 15m",
    );
    expect(
      screen.getByTestId("production-time-headline-remaining"),
    ).toHaveTextContent("20m left");

    expect(
      screen.getAllByTestId("production-time-row-label").map((node) => node.textContent),
    ).toEqual(["Structural Repair", "Sanding", "Finishing", "Upholstery"]);
  });

  it("draws one segment per worked section plus the unconsumed tail", () => {
    render(<ProductionTimeCard viewModel={productionTimeMockupFixture} />);

    expect(screen.getAllByTestId("production-time-budget-segment")).toHaveLength(4);
    expect(screen.getByTestId("production-time-budget-remainder")).toBeInTheDocument();
  });

  it("expands only the working section, with its typical and verdict", () => {
    render(<ProductionTimeCard viewModel={productionTimeMockupFixture} />);

    const details = screen.getAllByTestId("production-time-row-detail");
    expect(details).toHaveLength(1);
    expect(details[0]).toHaveTextContent("typical 1h 0m");
    // The verdict renders as served in every state, working included — the
    // live-clock go-live (2026-08-22) made the served value trustworthy
    // mid-work, so nothing may suppress or relabel it.
    expect(
      screen.getByTestId("production-time-row-verdict"),
    ).toHaveTextContent("On track");
    // The typical marker is gone (plan E3): provably at the same ratio on
    // every row, it carried no information. The typical lives on as text.
    expect(
      screen.queryByTestId("production-time-row-typical-marker"),
    ).not.toBeInTheDocument();
  });

  it("does not render a remaining-time footer note", () => {
    render(<ProductionTimeCard viewModel={productionTimeMockupFixture} />);

    expect(
      screen.queryByTestId("production-time-footer-note"),
    ).not.toBeInTheDocument();
  });

  it("reports an overrun without a hatched tail", () => {
    render(<ProductionTimeCard viewModel={productionTimeOverBudgetFixture} />);

    expect(
      screen.getByTestId("production-time-headline-remaining"),
    ).toHaveTextContent("45m over");
    expect(
      screen.queryByTestId("production-time-budget-remainder"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("production-time-row-verdict")).toHaveTextContent(
      "Over share",
    );
  });
});

describe("ProductionTimeCard — edge cases from the handoff", () => {
  it("renders a reassigned section as one row carrying its pass count", () => {
    render(<ProductionTimeCard viewModel={productionTimeEdgeCasesFixture} />);

    const labels = screen.getAllByTestId("production-time-row-label");
    expect(labels).toHaveLength(3);
    expect(labels[0]).toHaveTextContent("Structural Repair");

    // One caption, on the reassigned row only — and beneath the time, because
    // that is the figure it qualifies.
    const passes = screen.getAllByTestId("production-time-row-passes");
    expect(passes).toHaveLength(1);
    expect(passes[0]).toHaveTextContent("2 passes");
    expect(passes[0]).toHaveAttribute(
      "title",
      "Worked in 2 passes — the time shown covers all of them.",
    );
  });

  it("leaves single-pass rows uncluttered", () => {
    render(<ProductionTimeCard viewModel={productionTimeMockupFixture} />);

    expect(
      screen.queryByTestId("production-time-row-passes"),
    ).not.toBeInTheDocument();
  });

  it("mutes an excluded section and gives it no segment", () => {
    render(<ProductionTimeCard viewModel={productionTimeEdgeCasesFixture} />);

    const excluded = screen.getAllByTestId("production-time-row-label")[1];
    expect(excluded).toHaveTextContent("Glazing");
    expect(excluded).toHaveClass("line-through");
    // Two sections worked; the excluded one contributes nothing to the bar.
    expect(screen.getAllByTestId("production-time-budget-segment")).toHaveLength(2);
  });

  it("draws a full bar for a section whose allowance is already negative", () => {
    render(<ProductionTimeCard viewModel={productionTimeEdgeCasesFixture} />);

    const progress = screen.getByTestId("production-time-row-progress");
    const fill = progress.querySelector("span");
    expect(fill).toHaveStyle({ width: "100%" });
    expect(
      screen.queryByTestId("production-time-row-typical-marker"),
    ).not.toBeInTheDocument();
  });
});

describe("ProductionTimeCard — long pipelines", () => {
  it("collapses to four rows but keeps the working stage visible", () => {
    render(<ProductionTimeCard viewModel={productionTimeLongPipelineFixture} />);

    const labels = screen
      .getAllByTestId("production-time-row-label")
      .map((node) => node.textContent);

    expect(labels).toEqual([
      "Intake",
      "Stripping",
      "Structural Repair",
      "Sanding",
      "Upholstery",
    ]);
    expect(screen.getByTestId("production-time-rows-toggle")).toHaveTextContent(
      "Show all 9 stages",
    );
  });

  it("shows the whole pipeline once expanded", async () => {
    const user = userEvent.setup();
    render(<ProductionTimeCard viewModel={productionTimeLongPipelineFixture} />);

    await user.click(screen.getByTestId("production-time-rows-toggle"));

    expect(screen.getAllByTestId("production-time-row-label")).toHaveLength(9);
    expect(screen.getByTestId("production-time-rows-toggle")).toHaveTextContent(
      "Show less",
    );
  });

  it("keeps the bar describing the whole pipeline while collapsed", () => {
    render(<ProductionTimeCard viewModel={productionTimeLongPipelineFixture} />);

    // Eight sections have worked time, though only five rows are on screen.
    expect(screen.getAllByTestId("production-time-budget-segment")).toHaveLength(8);
    expect(
      screen.queryByTestId("production-time-footer-note"),
    ).not.toBeInTheDocument();
  });

  it("offers no toggle for a short pipeline", () => {
    render(<ProductionTimeCard viewModel={productionTimeEdgeCasesFixture} />);

    expect(
      screen.queryByTestId("production-time-rows-toggle"),
    ).not.toBeInTheDocument();
  });

  it.each(["budget", "no_budget"] as const)(
    "offers no dead toggle when all five %s rows are already visible",
    (kind) => {
      render(
        <ProductionTimeCard
          viewModel={viewModelWithRows(kind, fiveRowsWithLastActive())}
        />,
      );

      expect(screen.getAllByTestId("production-time-row")).toHaveLength(5);
      expect(
        screen.queryByTestId("production-time-rows-toggle"),
      ).not.toBeInTheDocument();
    },
  );
});

describe("ProductionTimeCard — degraded states", () => {
  it("keeps the frame and names the missing thing rather than showing zeros", () => {
    render(<ProductionTimeCard viewModel={productionTimeNotEvaluatedFixture} />);

    const reason = screen.getByTestId("production-time-no-budget-reason");
    expect(reason).toHaveTextContent("Budget not calculated yet");
    expect(reason).toHaveAttribute("title", "not_evaluated");

    expect(screen.queryByTestId("production-time-budget-bar")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("production-time-row-detail"),
    ).not.toBeInTheDocument();
  });

  it("still shows the real pipeline against its typicals", () => {
    render(<ProductionTimeCard viewModel={productionTimeNotEvaluatedFixture} />);

    const rows = screen.getAllByTestId("production-time-row");
    expect(within(rows[1]).getByTestId("production-time-row-time")).toHaveTextContent(
      /^50m\s*of typically 50m$/,
    );
  });

  it("renders no call to action while v1 is read-only", () => {
    render(<ProductionTimeCard viewModel={productionTimeNotEvaluatedFixture} />);

    expect(
      screen.queryByTestId("production-time-no-budget-cta"),
    ).not.toBeInTheDocument();
  });

  it("collapses and expands a long degraded pipeline", async () => {
    const user = userEvent.setup();

    if (productionTimeLongPipelineFixture.kind !== "budget") {
      throw new Error("Expected the long fixture to carry a budget.");
    }

    render(
      <ProductionTimeCard
        viewModel={viewModelWithRows(
          "no_budget",
          productionTimeLongPipelineFixture.card.rows,
        )}
      />,
    );

    expect(screen.getAllByTestId("production-time-row")).toHaveLength(5);
    expect(screen.getByTestId("production-time-rows-toggle")).toHaveTextContent(
      "Show all 9 stages",
    );

    await user.click(screen.getByTestId("production-time-rows-toggle"));

    expect(screen.getAllByTestId("production-time-row")).toHaveLength(9);
    expect(screen.getByTestId("production-time-rows-toggle")).toHaveTextContent(
      "Show less",
    );
  });

  it("shows an empty state rather than stale numbers when the item detached", () => {
    render(<ProductionTimeCard viewModel={productionTimeUnavailableFixture} />);

    expect(screen.getByTestId("production-time-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("production-time-row")).not.toBeInTheDocument();
  });

  it("renders nothing for a task with no stages assigned", () => {
    const { container } = render(
      <ProductionTimeCard viewModel={productionTimeEmptyFixture} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe("ProductionTimeCardSkeleton", () => {
  it("reflects the real card rather than a generic block", () => {
    render(<ProductionTimeCardSkeleton />);

    expect(screen.getByTestId("production-time-skeleton")).toBeInTheDocument();
    expect(screen.getByText("Production time")).toBeInTheDocument();
  });
});
