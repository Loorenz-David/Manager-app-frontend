import { describe, expect, it } from "vitest";

import type { TypicalResolution } from "../types";
import {
  buildStrategyFilters,
  buildTypicalStrategy,
  humanizeFacetName,
} from "./typical-strategy";

function resolution(
  overrides: Partial<TypicalResolution> = {},
): TypicalResolution {
  return {
    task_typical_basis: "item_narrowed_uniform",
    reconciliation_method: "uniform_basis_v1",
    comparability_profile: "primary_item_category_v1",
    applied_filter: {
      item_category_ids: ["itc_chair"],
      item_categories: [{ client_id: "itc_chair", name: "Chair" }],
    },
    facet: null,
    participating_section_count: 3,
    sections_by_basis: {
      item_properties_narrowed: 0,
      item_facet_narrowed: 0,
      item_narrowed: 3,
      section_wide: 0,
      insufficient_sample: 0,
    },
    ...overrides,
  };
}

function build(overrides: Partial<TypicalResolution> = {}) {
  return buildTypicalStrategy({
    resolution: resolution(overrides),
    windowDays: 90,
    minSampleSize: 5,
  });
}

describe("buildTypicalStrategy — the basis a reader sees", () => {
  it("names the category on the plain narrowed rung", () => {
    const strategy = build();

    expect(strategy.pillLabel).toBe("Same category");
    expect(strategy.tone).toBe("broad");
    expect(strategy.summary).toContain("other items in Chair");
  });

  it("names the facet itself on a facet rung", () => {
    // "Same upholstery" is the whole reason `facet` is served — "narrowed"
    // would tell the reader nothing they can act on.
    const strategy = build({
      task_typical_basis: "item_facet_narrowed_uniform",
      facet: "upholstery",
    });

    expect(strategy.pillLabel).toBe("Same upholstery");
    expect(strategy.tone).toBe("narrow");
    expect(strategy.summary).toContain("same upholstery");
  });

  it("falls back to the generic narrow copy when a facet basis serves no name", () => {
    const strategy = build({
      task_typical_basis: "item_facet_narrowed_uniform",
      facet: null,
    });

    expect(strategy.pillLabel).toBe("Same specification");
    expect(strategy.tone).toBe("narrow");
  });

  it("reads the full-profile rung as a specification match", () => {
    const strategy = build({
      task_typical_basis: "item_properties_narrowed_uniform",
    });

    expect(strategy.pillLabel).toBe("Same specification");
    expect(strategy.tone).toBe("narrow");
  });

  it("says plainly when there was no close match at all", () => {
    const strategy = build({
      task_typical_basis: "section_wide_uniform",
      applied_filter: null,
    });

    expect(strategy.pillLabel).toBe("All work in the stage");
    expect(strategy.tone).toBe("weak");
    expect(strategy.summary).toContain("not enough history");
    expect(strategy.filters).toEqual([]);
  });

  it("admits an unrecognised basis instead of describing one", () => {
    // A confident sentence behind an unknown value is worse than no sentence:
    // the figures are still the server's, but their provenance is not ours to
    // invent.
    const strategy = build({ task_typical_basis: "item_colour_uniform" });

    expect(strategy.pillLabel).toBe("Custom match");
    expect(strategy.tone).toBe("weak");
    expect(strategy.summary).toContain("does not recognise");
  });

  it("degrades to an unnamed category rather than printing an id", () => {
    const strategy = build({
      applied_filter: {
        item_category_ids: ["itc_gone"],
        item_categories: [{ client_id: "itc_gone", name: null }],
      },
    });

    expect(strategy.summary).toContain("other items in this category");
    expect(strategy.filters).toContainEqual({
      label: "Category",
      value: "1 category",
    });
    expect(JSON.stringify(strategy)).not.toContain("itc_gone");
  });
});

describe("buildTypicalStrategy — the stage breakdown", () => {
  it("stays silent when every stage matched the same way", () => {
    // "3 of 3 stages" under a sentence that already said so is noise.
    const strategy = build();

    expect(strategy.breakdownLabel).toBeNull();
    expect(strategy.breakdown).toEqual([]);
  });

  it("names the disagreement when the stages differ", () => {
    // This is the case worth surfacing: the section-wide stage's budget slice
    // was sized from weaker evidence than its neighbours'.
    const strategy = build({
      participating_section_count: 5,
      sections_by_basis: {
        item_properties_narrowed: 0,
        item_facet_narrowed: 0,
        item_narrowed: 4,
        section_wide: 1,
        insufficient_sample: 0,
      },
    });

    expect(strategy.breakdownLabel).toBe(
      "Not every stage matched the same way",
    );
    expect(strategy.breakdown).toEqual([
      { label: "Same category", value: "4 of 5 stages" },
      { label: "All work in the stage", value: "1 of 5 stages" },
    ]);
  });

  it("omits zero counters rather than listing every basis", () => {
    const strategy = build({
      participating_section_count: 2,
      sections_by_basis: {
        item_properties_narrowed: 1,
        item_facet_narrowed: 0,
        item_narrowed: 0,
        section_wide: 0,
        insufficient_sample: 1,
      },
    });

    expect(strategy.breakdown.map((row) => row.label)).toEqual([
      "Same specification",
      "Not enough history",
    ]);
  });
});

describe("buildStrategyFilters", () => {
  it("reports the specification hash as a presence, never a value", () => {
    // It is an opaque hash; printing it would look like something actionable.
    const rows = buildStrategyFilters({
      item_category_ids: ["itc_chair"],
      item_categories: [{ client_id: "itc_chair", name: "Chair" }],
      properties_signature: "sig-mahogany-ud",
    });

    expect(rows).toContainEqual({
      label: "Specification",
      value: "Matched in full",
    });
    expect(JSON.stringify(rows)).not.toContain("sig-mahogany-ud");
  });

  it("spells out the facet key and value a reader can check", () => {
    const rows = buildStrategyFilters({
      properties_facets: [{ upholstery: "Up & Down" }],
    });

    expect(rows).toEqual([{ label: "Upholstery", value: "Up & Down" }]);
  });

  it("renders each dimension range, open bounds included", () => {
    const rows = buildStrategyFilters({
      width_cm: [40, 60],
      height_cm: [null, 120],
      depth_cm: [30, null],
    });

    expect(rows).toEqual([
      { label: "Width", value: "40–60 cm" },
      { label: "Height", value: "up to 120 cm" },
      { label: "Depth", value: "30 cm and up" },
    ]);
  });

  it("is empty when the task narrows on nothing", () => {
    expect(buildStrategyFilters(null)).toEqual([]);
  });
});

describe("humanizeFacetName", () => {
  it("uses the mapped copy for a declared rung", () => {
    expect(humanizeFacetName("upholstery")).toBe("upholstery");
    expect(humanizeFacetName("extension_type")).toBe("extension type");
  });

  it("keeps an unmapped future rung readable rather than raw", () => {
    // The backend can add rungs to PROPERTY_FACET_LADDER without a frontend
    // release; "leg finish" beats "leg_finish".
    expect(humanizeFacetName("leg_finish")).toBe("leg finish");
  });

  it("joins a multi-key rung as prose", () => {
    expect(humanizeFacetName("upholstery+extension_type")).toBe(
      "upholstery and extension type",
    );
  });
});

describe("buildTypicalStrategy — method rows", () => {
  it("states the window and gate when the payload carried them", () => {
    expect(build().method).toEqual([
      { label: "History window", value: "Last 90 days" },
      { label: "Minimum sample", value: "5 completed jobs per stage" },
      { label: "Value used", value: "Median, not average" },
    ]);
  });

  it("omits them rather than asserting a configuration it was not told", () => {
    // A task with no typical anywhere serves no window or gate. Defaulting to
    // "90 days" would be a claim about the server, not a reading of it.
    const strategy = buildTypicalStrategy({
      resolution: resolution(),
      windowDays: null,
      minSampleSize: null,
    });

    expect(strategy.method).toEqual([
      { label: "Value used", value: "Median, not average" },
    ]);
  });
});
