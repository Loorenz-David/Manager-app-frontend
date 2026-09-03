import { describe, expect, it } from "vitest";

import type { TypicalResolution } from "../types";
import {
  buildItemProperties,
  buildStrategyCriteria,
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
    // The reason moved to the criteria note, which states it more precisely.
    expect(strategy.summary).toContain("whatever item it was for");
    expect(strategy.criteria).toEqual([]);
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
    expect(strategy.criteria).toContainEqual({
      label: "Category",
      value: "1 category",
      status: "used",
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

/**
 * Every axis an item can carry, so each basis can be asserted against the same
 * list. The point of the table below is that the list never changes — only the
 * rung's verdict on it does.
 */
const FULL_FILTER = {
  item_category_ids: ["itc_chair"],
  item_categories: [{ client_id: "itc_chair", name: "Dining Chairs" }],
  width_cm: [40, 60],
  can_have_upholstery: true,
  designers: ["dsg_aalto"],
  properties_facets: [
    { upholstery: "Up & Down" },
    { extension_type: "Butterfly" },
  ],
  properties_signature: "sig-mahogany-ud",
  properties: { wood_type: "Walnut", upholstery: "Up & Down" },
};

const ITEM_LABELS = ["Category", "Width", "Upholstered", "Designer"];

function usedLabels(basis: string, facet: string | null): string[] {
  return buildStrategyCriteria(FULL_FILTER, basis, facet)
    .filter((row) => row.status === "used")
    .map((row) => row.label);
}

describe("buildStrategyCriteria — what the rung actually applied", () => {
  it("lists the same criteria whatever the basis", () => {
    // The list is a description of the item, so it must not shrink when the
    // match weakens — that was the old bug in reverse.
    const labels = ["Upholstery", "Extension type", "Specification"];

    for (const basis of [
      "item_properties_narrowed_uniform",
      "item_facet_narrowed_uniform",
      "item_narrowed_uniform",
      "section_wide_uniform",
    ]) {
      expect(
        buildStrategyCriteria(FULL_FILTER, basis, "upholstery").map(
          (row) => row.label,
        ),
      ).toEqual([...ITEM_LABELS, ...labels]);
    }
  });

  it("1. full-specification winner marks every criterion used", () => {
    // Equal signatures mean identical property snapshots, so the facets held
    // too — this is the one rung entitled to claim the whole list.
    expect(usedLabels("item_properties_narrowed_uniform", null)).toEqual([
      ...ITEM_LABELS,
      "Upholstery",
      "Extension type",
      "Specification",
    ]);
  });

  it("2. facet winner keeps the winning facet and drops the specification", () => {
    expect(usedLabels("item_facet_narrowed_uniform", "upholstery")).toEqual([
      ...ITEM_LABELS,
      "Upholstery",
    ]);

    const rows = buildStrategyCriteria(
      FULL_FILTER,
      "item_facet_narrowed_uniform",
      "upholstery",
    );
    // The rung it fell back FROM, and a rung it never reached.
    expect(rows).toContainEqual({
      label: "Specification",
      value: "Full specification",
      status: "not_used",
    });
    expect(rows).toContainEqual({
      label: "Extension type",
      value: "Butterfly",
      status: "not_used",
    });
  });

  it("2b. a facet name the app cannot line up claims nothing", () => {
    // Under-claiming is the safe direction: a rung we cannot identify must not
    // borrow the verdict of one we can.
    expect(usedLabels("item_facet_narrowed_uniform", "leg_finish")).toEqual(
      ITEM_LABELS,
    );
  });

  it("3. category winner drops every facet and the specification", () => {
    expect(usedLabels("item_narrowed_uniform", null)).toEqual(ITEM_LABELS);
  });

  it("4. section-wide winner claims nothing at all", () => {
    // The reported bug: this basis measured over stage history alone, yet the
    // sheet listed the item's category as something it had matched on.
    const rows = buildStrategyCriteria(
      FULL_FILTER,
      "section_wide_uniform",
      null,
    );

    expect(rows.every((row) => row.status === "not_used")).toBe(true);
    expect(usedLabels("section_wide_uniform", null)).toEqual([]);
  });

  it("says it does not know rather than guessing on an unknown basis", () => {
    const rows = buildStrategyCriteria(
      FULL_FILTER,
      "item_colour_uniform",
      null,
    );

    expect(rows.every((row) => row.status === "unknown")).toBe(true);
  });

  it("never marks a criterion used on a rung that does not apply it", () => {
    // The invariant the whole change exists to hold. Stated as a rule rather
    // than a fixture so a new axis cannot quietly grant itself a claim.
    const APPLIES: Record<string, (label: string) => boolean> = {
      item_properties_narrowed_uniform: () => true,
      item_facet_narrowed_uniform: (label) =>
        ITEM_LABELS.includes(label) || label === "Upholstery",
      item_narrowed_uniform: (label) => ITEM_LABELS.includes(label),
      section_wide_uniform: () => false,
    };

    for (const [basis, applies] of Object.entries(APPLIES)) {
      for (const row of buildStrategyCriteria(
        FULL_FILTER,
        basis,
        "upholstery",
      )) {
        if (row.status === "used") {
          expect(
            applies(row.label),
            `${basis} claimed "${row.label}" without applying it`,
          ).toBe(true);
        }
      }
    }
  });

  it("reports the specification hash as a presence, never a value", () => {
    // It is an opaque hash; printing it would look like something actionable.
    const rows = buildStrategyCriteria(
      {
        item_category_ids: ["itc_chair"],
        item_categories: [{ client_id: "itc_chair", name: "Chair" }],
        properties_signature: "sig-mahogany-ud",
      },
      "item_properties_narrowed_uniform",
      null,
    );

    expect(rows).toContainEqual({
      label: "Specification",
      value: "Full specification",
      status: "used",
    });
    expect(JSON.stringify(rows)).not.toContain("sig-mahogany-ud");
  });

  it("spells out the facet key and value a reader can check", () => {
    expect(
      buildStrategyCriteria(
        { properties_facets: [{ upholstery: "Up & Down" }] },
        "item_facet_narrowed_uniform",
        "upholstery",
      ),
    ).toEqual([{ label: "Upholstery", value: "Up & Down", status: "used" }]);
  });

  it("renders each dimension range, open bounds included", () => {
    expect(
      buildStrategyCriteria(
        { width_cm: [40, 60], height_cm: [null, 120], depth_cm: [30, null] },
        "item_narrowed_uniform",
        null,
      ),
    ).toEqual([
      { label: "Width", value: "40–60 cm", status: "used" },
      { label: "Height", value: "up to 120 cm", status: "used" },
      { label: "Depth", value: "30 cm and up", status: "used" },
    ]);
  });

  it("is empty when the task narrows on nothing", () => {
    expect(buildStrategyCriteria(null, "section_wide_uniform", null)).toEqual(
      [],
    );
  });
});

describe("buildTypicalStrategy — the note that reconciles list and rung", () => {
  it("confirms the whole list on a full-specification match", () => {
    const strategy = build({
      task_typical_basis: "item_properties_narrowed_uniform",
      applied_filter: FULL_FILTER,
    });

    expect(strategy.criteriaNote).toBe(
      "Every stage had enough finished jobs for this exact item.",
    );
  });

  it("names the specification as the thing that ran out of history", () => {
    const strategy = build({
      task_typical_basis: "item_facet_narrowed_uniform",
      facet: "upholstery",
      applied_filter: FULL_FILTER,
    });

    // Names the mechanism a reader can act on — a thin STAGE, not a thin
    // history — and the rung it landed on.
    expect(strategy.criteriaNote).toContain(
      "Some stages had too few finished jobs",
    );
    expect(strategy.criteriaNote).toContain("same upholstery");
  });

  it("does not claim something was dropped when nothing was", () => {
    // A filter with no signature and no facets abandoned nothing on the way to
    // the category rung; saying otherwise would swap one untruth for another.
    const strategy = build({
      task_typical_basis: "item_narrowed_uniform",
      applied_filter: {
        item_category_ids: ["itc_chair"],
        item_categories: [{ client_id: "itc_chair", name: "Chair" }],
      },
    });

    expect(strategy.criteriaNote).toBe(
      "Every stage had enough finished jobs for this match.",
    );
  });

  it("says plainly that a category-rung fallback dropped the closer rungs", () => {
    const strategy = build({
      task_typical_basis: "item_narrowed_uniform",
      applied_filter: FULL_FILTER,
    });

    expect(strategy.criteriaNote).toBe(
      "Some stages had too few finished jobs for a closer match, so only the category was used.",
    );
  });

  it("states outright that section-wide used none of them", () => {
    const strategy = build({
      task_typical_basis: "section_wide_uniform",
      applied_filter: FULL_FILTER,
    });

    expect(strategy.criteriaNote).toBe(
      "Some stages had too few finished jobs for this item, so times come from all work in each stage instead.",
    );
  });

  it("has no note to give when the item narrows on nothing", () => {
    const strategy = build({
      task_typical_basis: "section_wide_uniform",
      applied_filter: null,
    });

    expect(strategy.criteriaNote).toBeNull();
  });
});

describe("buildTypicalStrategy — the budget note", () => {
  it("stays silent when the match held", () => {
    // A reader whose match survived does not need telling what a fallback
    // would have cost them; the note is for the fallback cases.
    expect(build().budgetNote).toBe("");
  });

  it("drops the closer-match advice for a reader who did not get one", () => {
    // "A closer match would change the allowances" is empty counsel to a task
    // that has just been told no closer match existed.
    const note = build({
      task_typical_basis: "section_wide_uniform",
    }).budgetNote;

    expect(note).toContain("stage-wide history");
    expect(note).toContain("not on anything specific to this item");
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
      { label: "Minimum sample", value: "5 finished jobs per stage" },
      { label: "Value used", value: "Median" },
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

    expect(strategy.method).toEqual([{ label: "Value used", value: "Median" }]);
  });
});

describe("buildItemProperties — what the item actually is", () => {
  it("names every property the signature covers", () => {
    // The reported bug: the sheet said "Same specification" while showing
    // Category and Upholstery, so wood type — which cut the cleaning-seat
    // cohort from 45 jobs to 10 — was invisible.
    expect(buildItemProperties(FULL_FILTER)).toEqual([
      { label: "Wood type", value: "Walnut" },
      { label: "Upholstery", value: "Up & Down" },
    ]);
  });

  it("is empty when the filter carried no snapshot", () => {
    // No signature means no property took part in the match, so there is
    // nothing here to explain.
    expect(buildItemProperties({ item_category_ids: ["itc_chair"] })).toEqual(
      [],
    );
    expect(buildItemProperties(null)).toEqual([]);
  });

  it("renders a non-string value rather than dropping the row", () => {
    // Values are trusted verbatim by the server's signature, so the shape is
    // not ours to assume.
    expect(
      buildItemProperties({
        properties_signature: "sig",
        properties: { seat_count: 4, reclines: true },
      }),
    ).toEqual([
      { label: "Seat count", value: "4" },
      { label: "Reclines", value: "true" },
    ]);
  });

  it("reaches the view model beside the criteria", () => {
    const strategy = build({
      task_typical_basis: "item_properties_narrowed_uniform",
      applied_filter: FULL_FILTER,
    });

    expect(strategy.itemProperties).toContainEqual({
      label: "Wood type",
      value: "Walnut",
    });
  });
});
