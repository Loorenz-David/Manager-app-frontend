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
  productionTimeProjectedOverrunFixture,
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
      rows: rows.map((row) => ({
        ...row,
        terminalMetrics: null,
        activeMetrics: null,
        detail: null,
      })),
    },
  };
}

describe("ProductionTimeCard — row information hierarchy", () => {
  it("shows a muted target grid for pending steps", () => {
    if (productionTimeFiveStageFixture.kind !== "budget") {
      throw new Error("Expected the five-stage fixture to carry a budget.");
    }
    const pendingRow = productionTimeFiveStageFixture.card.rows[4]!;

    render(
      <ProductionTimeCard
        viewModel={{
          kind: "budget",
          card: {
            ...productionTimeFiveStageFixture.card,
            rows: [pendingRow],
          },
        }}
      />,
    );

    const metrics = screen.getByTestId("production-time-row-metrics");
    expect(metrics).toHaveClass("opacity-60");
    expect(metrics).toHaveTextContent("Budget15m");
    expect(metrics).toHaveTextContent("Pressure10m");
    expect(metrics).toHaveTextContent("Typical15m");
    expect(
      screen.queryByTestId("production-time-row-budget"),
    ).not.toBeInTheDocument();
  });

  it("uses metric grids for terminal and active rows", () => {
    render(<ProductionTimeCard viewModel={productionTimeMockupFixture} />);

    const metrics = screen.getAllByTestId("production-time-row-metrics");
    expect(metrics).toHaveLength(4);
    expect(metrics[0]).toHaveTextContent("Budget1h 15m");
    expect(metrics[0]).toHaveTextContent("Variance5munder budget");
    expect(metrics[2]).toHaveTextContent("Pressure30m");
  });

  it("uses the bullet as the only visible state reference", () => {
    render(<ProductionTimeCard viewModel={productionTimeMockupFixture} />);

    const firstRow = screen.getAllByTestId("production-time-row")[0]!;
    expect(
      within(firstRow).queryByTestId("production-time-row-state"),
    ).not.toBeInTheDocument();
    expect(
      within(firstRow).getByTestId("production-time-row-state-indicator"),
    ).toHaveAttribute("aria-label", "Completed");
  });

  it("says the allowance alone when the section has no typical yet", () => {
    const rows = fiveRowsWithLastActive()
      .slice(0, 1)
      .map((row) => ({
        ...row,
        detail: null,
        isActive: false,
        isTerminal: false,
        terminalMetrics: null,
        activeMetrics: null,
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
        isTerminal: false,
        terminalMetrics: null,
        activeMetrics: null,
        allowanceLabel: null,
        typicalLabel: null,
      }));

    render(<ProductionTimeCard viewModel={viewModelWithRows("budget", rows)} />);

    expect(
      screen.queryByTestId("production-time-row-budget"),
    ).not.toBeInTheDocument();
  });

  it("never renders a fallback pressure line without a valuation", () => {
    const rows = fiveRowsWithLastActive().map((row) => ({
      ...row,
      allowanceLabel: null,
      typicalLabel: null,
      typicalComparisonLabel: null,
      pressureLabel: "30m pressure",
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
  it("renders the projected-overrun warning as a soft danger alert", () => {
    render(
      <ProductionTimeCard viewModel={productionTimeProjectedOverrunFixture} />,
    );

    expect(screen.getByTestId("production-time-outlook")).toHaveClass(
      "rounded-lg",
      "border-current",
      "bg-[#fff3f1]",
      "text-[#b9382a]",
    );
  });

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

  it("expands working and paused sections with pressure and position copy", () => {
    render(<ProductionTimeCard viewModel={productionTimeMockupFixture} />);

    const details = screen.getAllByTestId("production-time-row-detail");
    expect(details).toHaveLength(2);
    expect(details[0]).toHaveTextContent("Pressure30m");
    expect(details[1]).toHaveTextContent("Pressure55m");
    expect(screen.getAllByTestId("production-time-row-position")).toHaveLength(2);
    expect(
      screen.queryByTestId("production-time-row-verdict"),
    ).not.toBeInTheDocument();
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
    expect(
      screen.queryByTestId("production-time-row-position"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("production-time-row-verdict"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("production-time-metric-over-budget"),
    ).toHaveTextContent("Over budget15m");
    expect(
      screen.queryByTestId("production-time-metric-pressure"),
    ).not.toBeInTheDocument();
  });

  it("draws active progress against pressure rather than the larger budget", () => {
    render(<ProductionTimeCard viewModel={productionTimeMockupFixture} />);

    const details = screen.getAllByTestId("production-time-row-detail");
    const workingProgress = within(details[1]!).getByTestId(
      "production-time-row-progress",
    );
    expect(workingProgress.querySelector("span")).toHaveStyle({
      width: `${(2400 / 3300) * 100}%`,
    });
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

  it("keeps missing terminal metrics visible as dashes", () => {
    render(<ProductionTimeCard viewModel={productionTimeEdgeCasesFixture} />);

    const cancelledRow = screen.getAllByTestId("production-time-row")[1]!;
    const metrics = within(cancelledRow).getByTestId(
      "production-time-row-metrics",
    );
    expect(metrics).toHaveTextContent("Budget-");
    expect(metrics).toHaveTextContent("Variance-");
    expect(metrics).toHaveTextContent("Typical-");
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
  it("keeps every row in the DOM behind the collapsed scroll viewport", () => {
    render(<ProductionTimeCard viewModel={productionTimeLongPipelineFixture} />);

    // All nine rows render — the fixed three-row window scrolls over them
    // rather than truncating the list.
    expect(
      screen.getByTestId("production-time-rows-viewport"),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("production-time-row-label")).toHaveLength(9);
    expect(screen.getByTestId("production-time-rows-toggle")).toHaveTextContent(
      "Show all 9 stages",
    );
  });

  it("hands scrolling back to the page once expanded", async () => {
    const user = userEvent.setup();
    render(<ProductionTimeCard viewModel={productionTimeLongPipelineFixture} />);

    await user.click(screen.getByTestId("production-time-rows-toggle"));

    expect(
      screen.queryByTestId("production-time-rows-viewport"),
    ).not.toBeInTheDocument();
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

  it("offers no toggle or viewport for a pipeline that already fits", () => {
    render(<ProductionTimeCard viewModel={productionTimeEdgeCasesFixture} />);

    expect(
      screen.queryByTestId("production-time-rows-toggle"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("production-time-rows-viewport"),
    ).not.toBeInTheDocument();
  });

  it.each(["budget", "no_budget"] as const)(
    "scrolls five %s rows behind the three-row window",
    (kind) => {
      render(
        <ProductionTimeCard
          viewModel={viewModelWithRows(kind, fiveRowsWithLastActive())}
        />,
      );

      expect(screen.getAllByTestId("production-time-row")).toHaveLength(5);
      expect(
        screen.getByTestId("production-time-rows-viewport"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("production-time-rows-toggle"),
      ).toHaveTextContent("Show all 5 stages");
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
    expect(
      within(rows[1]).queryByTestId("production-time-row-budget"),
    ).not.toBeInTheDocument();
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

    expect(screen.getAllByTestId("production-time-row")).toHaveLength(9);
    expect(
      screen.getByTestId("production-time-rows-viewport"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("production-time-rows-toggle")).toHaveTextContent(
      "Show all 9 stages",
    );

    await user.click(screen.getByTestId("production-time-rows-toggle"));

    expect(screen.getAllByTestId("production-time-row")).toHaveLength(9);
    expect(
      screen.queryByTestId("production-time-rows-viewport"),
    ).not.toBeInTheDocument();
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
