import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTypicalStrategy } from "../../lib/typical-strategy";
import { TypicalStrategyPill } from "./TypicalStrategyPill";
import { TypicalStrategySheetContent } from "./TypicalStrategySheetContent";

afterEach(cleanup);

const MIXED_STRATEGY = buildTypicalStrategy({
  resolution: {
    task_typical_basis: "item_facet_narrowed_uniform",
    reconciliation_method: "uniform_basis_v1",
    comparability_profile: "primary_item_category_properties_v2",
    applied_filter: {
      item_category_ids: ["itc_chair"],
      item_categories: [{ client_id: "itc_chair", name: "Chair" }],
      properties_signature: "sig-mahogany-ud",
      properties_facets: [{ upholstery: "Up & Down" }],
    },
    facet: "upholstery",
    participating_section_count: 5,
    sections_by_basis: {
      item_properties_narrowed: 0,
      item_facet_narrowed: 4,
      item_narrowed: 0,
      section_wide: 1,
      insufficient_sample: 0,
    },
  },
  windowDays: 90,
  minSampleSize: 5,
});

describe("TypicalStrategyPill", () => {
  it("states the basis without a tap target when no opener was injected", () => {
    // A host that has not registered the sheet must still get the label —
    // a dead button would be worse than a plain statement.
    render(<TypicalStrategyPill label="Same upholstery" tone="narrow" />);

    expect(screen.getByTestId("typical-strategy-pill")).toHaveTextContent(
      "Typical fromSame upholstery",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("becomes a button once an opener exists", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(
      <TypicalStrategyPill
        label="Same category"
        tone="broad"
        onPress={onPress}
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("carries the tone for styling assertions", () => {
    render(<TypicalStrategyPill label="All work in the stage" tone="weak" />);

    expect(screen.getByTestId("typical-strategy-pill")).toHaveAttribute(
      "data-tone",
      "weak",
    );
  });
});

describe("TypicalStrategySheetContent", () => {
  it("names the population, the filters and the stage disagreement", () => {
    render(<TypicalStrategySheetContent strategy={MIXED_STRATEGY} />);

    expect(screen.getByTestId("typical-strategy-sheet-basis")).toHaveTextContent(
      "Same upholstery",
    );
    expect(screen.getByTestId("typical-strategy-summary")).toHaveTextContent(
      "same upholstery",
    );

    const filters = screen.getByTestId("typical-strategy-filters");
    expect(filters).toHaveTextContent("Chair");
    expect(filters).toHaveTextContent("Up & Down");

    const breakdown = screen.getByTestId("typical-strategy-breakdown");
    expect(breakdown).toHaveTextContent("4 of 5 stages");
    expect(breakdown).toHaveTextContent("1 of 5 stages");
  });

  it("never renders the opaque specification hash", () => {
    const { container } = render(
      <TypicalStrategySheetContent strategy={MIXED_STRATEGY} />,
    );

    expect(container.textContent).toContain("Matched in full");
    expect(container.textContent).not.toContain("sig-mahogany-ud");
  });

  it("says the match also sets the budget shares", () => {
    // The reason this surface exists: a basis is a fact about the allowances,
    // not only about a displayed number.
    const { container } = render(
      <TypicalStrategySheetContent strategy={MIXED_STRATEGY} />,
    );

    expect(container.textContent).toContain("share of the time budget");
  });

  it("omits the by-stage section entirely when every stage agreed", () => {
    const uniform = buildTypicalStrategy({
      resolution: {
        task_typical_basis: "item_narrowed_uniform",
        reconciliation_method: "uniform_basis_v1",
        comparability_profile: "primary_item_category_v1",
        applied_filter: null,
        facet: null,
        participating_section_count: 3,
        sections_by_basis: {
          item_properties_narrowed: 0,
          item_facet_narrowed: 0,
          item_narrowed: 3,
          section_wide: 0,
          insufficient_sample: 0,
        },
      },
      windowDays: 90,
      minSampleSize: 5,
    });

    render(<TypicalStrategySheetContent strategy={uniform} />);

    expect(
      screen.queryByTestId("typical-strategy-breakdown"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("typical-strategy-filters"),
    ).not.toBeInTheDocument();
  });
});
