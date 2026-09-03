import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTypicalStrategy } from "../../lib/typical-strategy";
import { TypicalStrategyPill } from "./TypicalStrategyPill";
import { TypicalStrategySheetContent } from "./TypicalStrategySheetContent";

afterEach(cleanup);

/**
 * One item — Dining Chairs, Up & Down upholstery, full signature — rendered on
 * each rung. Holding the item fixed is the point: the reported bug was that
 * these four sheets were indistinguishable below the summary.
 */
const APPLIED_FILTER = {
  item_category_ids: ["itc_chair"],
  item_categories: [{ client_id: "itc_chair", name: "Chair" }],
  properties_signature: "sig-mahogany-ud",
  properties: { wood_type: "Walnut", upholstery: "Up & Down" },
  properties_facets: [{ upholstery: "Up & Down" }],
};

function strategyOn(
  basis: string,
  facet: string | null = null,
  overrides: Record<string, unknown> = {},
) {
  return buildTypicalStrategy({
    resolution: {
      task_typical_basis: basis,
      reconciliation_method: "uniform_basis_v1",
      comparability_profile: "primary_item_category_properties_v2",
      applied_filter: APPLIED_FILTER,
      facet,
      participating_section_count: 5,
      sections_by_basis: {
        item_properties_narrowed: 0,
        item_facet_narrowed: 5,
        item_narrowed: 0,
        section_wide: 0,
        insufficient_sample: 0,
      },
      ...overrides,
    },
    windowDays: 90,
    minSampleSize: 5,
  });
}

const MIXED_STRATEGY = strategyOn("item_facet_narrowed_uniform", "upholstery", {
  sections_by_basis: {
    item_properties_narrowed: 0,
    item_facet_narrowed: 4,
    item_narrowed: 0,
    section_wide: 1,
    insufficient_sample: 0,
  },
});

function criterion(label: string): HTMLElement {
  return screen.getByTestId(`typical-strategy-criterion-${label}`);
}

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
  it("names the population, the item and the stage disagreement", () => {
    render(<TypicalStrategySheetContent strategy={MIXED_STRATEGY} />);

    expect(screen.getByTestId("typical-strategy-sheet-basis")).toHaveTextContent(
      "Same upholstery",
    );
    expect(screen.getByTestId("typical-strategy-summary")).toHaveTextContent(
      "same upholstery",
    );

    const criteria = screen.getByTestId("typical-strategy-criteria");
    expect(criteria).toHaveTextContent("Chair");
    expect(criteria).toHaveTextContent("Up & Down");
    expect(criteria).toHaveClass("bg-white");

    const breakdown = screen.getByTestId("typical-strategy-breakdown");
    expect(breakdown).toHaveTextContent("4 of 5 stages");
    expect(breakdown).toHaveTextContent("1 of 5 stages");
    expect(breakdown).toHaveTextContent("By stage");
    expect(breakdown.querySelectorAll("tr")).toHaveLength(2);
  });

  it("heads the item criteria neutrally rather than as a match", () => {
    // The reported bug in one assertion: a section-wide sheet listed the
    // item's category under "Matched on" when nothing had been matched.
    for (const basis of [
      "item_properties_narrowed_uniform",
      "item_facet_narrowed_uniform",
      "item_narrowed_uniform",
      "section_wide_uniform",
    ]) {
      const { container, unmount } = render(
        <TypicalStrategySheetContent strategy={strategyOn(basis, "upholstery")} />,
      );

      expect(container.textContent).toContain("This item");
      expect(container.textContent).not.toContain("Matched on");
      unmount();
    }
  });

  it("1. full-specification winner flags nothing as dropped", () => {
    render(
      <TypicalStrategySheetContent
        strategy={strategyOn("item_properties_narrowed_uniform")}
      />,
    );

    expect(criterion("category")).toHaveAttribute("data-status", "used");
    expect(criterion("upholstery")).toHaveAttribute("data-status", "used");
    // The signature row is back now that a table below spells out what it
    // covers; on this rung it is the one criterion entitled to claim the lot.
    expect(criterion("specification")).toHaveAttribute("data-status", "used");
    expect(
      screen.getByTestId("typical-strategy-criteria"),
    ).not.toHaveTextContent("Used to measure");
  });

  it("2. facet winner keeps the winning facet in the same table", () => {
    render(
      <TypicalStrategySheetContent
        strategy={strategyOn("item_facet_narrowed_uniform", "upholstery")}
      />,
    );

    expect(criterion("category")).toHaveAttribute("data-status", "used");
    expect(criterion("upholstery")).toHaveAttribute("data-status", "used");

    // Reached by falling back FROM the signature, so it must not read as held.
    expect(criterion("specification")).toHaveAttribute(
      "data-status",
      "not_used",
    );
    expect(
      screen.getByTestId("typical-strategy-criteria"),
    ).toHaveTextContent("Some stages had too few finished jobs");
  });

  it("3. category winner mutes and strikes through unused filter values", () => {
    render(
      <TypicalStrategySheetContent
        strategy={strategyOn("item_narrowed_uniform")}
      />,
    );

    expect(criterion("category")).toHaveAttribute("data-status", "used");
    const upholstery = criterion("upholstery");
    expect(upholstery).toHaveAttribute("data-status", "not_used");
    expect(upholstery).toHaveClass("bg-slate-50/80");
    expect(upholstery.querySelector("td")).toHaveClass("line-through");
  });

  it("4. section-wide winner says outright that none of them were used", () => {
    render(
      <TypicalStrategySheetContent
        strategy={strategyOn("section_wide_uniform")}
      />,
    );

    for (const label of ["category", "upholstery"]) {
      expect(criterion(label)).toHaveAttribute("data-status", "not_used");
    }
    expect(
      screen.getByTestId("typical-strategy-criteria"),
    ).toHaveTextContent("times come from all work in each stage instead");
  });

  it("never marks a criterion used on a rung that did not apply it", () => {
    // The invariant, asserted where the reader actually meets it: the DOM.
    const APPLIES: Record<string, string[]> = {
      item_properties_narrowed_uniform: [
        "category",
        "upholstery",
      ],
      item_facet_narrowed_uniform: ["category", "upholstery"],
      item_narrowed_uniform: ["category"],
      section_wide_uniform: [],
    };

    for (const [basis, allowed] of Object.entries(APPLIES)) {
      const { unmount } = render(
        <TypicalStrategySheetContent strategy={strategyOn(basis, "upholstery")} />,
      );

      for (const label of ["category", "upholstery"]) {
        if (criterion(label).getAttribute("data-status") === "used") {
          expect(
            allowed,
            `${basis} rendered "${label}" as used without applying it`,
          ).toContain(label);
        }
      }
      unmount();
    }
  });

  it("separates what was measured by from what the item is", () => {
    // The two tables answer different questions and must say which is which;
    // both were headed "This item" before, so a reader could not tell.
    render(
      <TypicalStrategySheetContent
        strategy={strategyOn("item_properties_narrowed_uniform")}
      />,
    );

    expect(screen.getByTestId("typical-strategy-criteria")).toHaveTextContent(
      "Measured by",
    );

    const properties = screen.getByTestId("typical-strategy-item-properties");
    expect(properties).toHaveTextContent("This item's properties");
    expect(properties).toHaveTextContent("Wood type");
    expect(properties).toHaveTextContent("Walnut");
  });

  it("names the property the criteria table could not, on every rung", () => {
    // Wood type is not on the facet ladder, so before the snapshot was served
    // it was unnameable — while doing most of the narrowing.
    for (const [basis, facet] of [
      ["item_properties_narrowed_uniform", null],
      ["item_facet_narrowed_uniform", "upholstery"],
      ["item_narrowed_uniform", null],
      ["section_wide_uniform", null],
    ] as const) {
      const { unmount } = render(
        <TypicalStrategySheetContent strategy={strategyOn(basis, facet)} />,
      );

      expect(
        screen.getByTestId("typical-strategy-item-properties"),
      ).toHaveTextContent("Walnut");
      unmount();
    }
  });

  it("omits the properties table when the filter carried no snapshot", () => {
    const noSignature = buildTypicalStrategy({
      resolution: {
        task_typical_basis: "item_narrowed_uniform",
        reconciliation_method: "uniform_basis_v1",
        comparability_profile: "primary_item_category_v1",
        applied_filter: { item_category_ids: ["itc_chair"] },
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

    render(<TypicalStrategySheetContent strategy={noSignature} />);

    expect(
      screen.queryByTestId("typical-strategy-item-properties"),
    ).not.toBeInTheDocument();
  });

  it("never renders the opaque specification hash", () => {
    const { container } = render(
      <TypicalStrategySheetContent strategy={MIXED_STRATEGY} />,
    );

    expect(container.textContent).toContain("Full specification");
    expect(container.textContent).not.toContain("sig-mahogany-ud");
  });

  it("keeps the budget note off a sheet whose match held", () => {
    // An empty note must not leave an empty paragraph behind it.
    render(<TypicalStrategySheetContent strategy={MIXED_STRATEGY} />);

    expect(
      screen.queryByTestId("typical-strategy-budget-note"),
    ).not.toBeInTheDocument();
  });

  it("does not dangle closer-match advice at a reader who got none", () => {
    render(
      <TypicalStrategySheetContent
        strategy={strategyOn("section_wide_uniform")}
      />,
    );

    const note = screen.getByTestId("typical-strategy-budget-note");
    expect(note).toHaveTextContent("stage-wide history");
    expect(note.textContent).not.toContain("closer match");
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
      screen.queryByTestId("typical-strategy-criteria"),
    ).not.toBeInTheDocument();
  });
});
