import { describe, expect, it } from "vitest";

import {
  AppliedTypicalFilterSchema,
  DEFAULT_TYPICAL_RESOLUTION,
  TypicalBasisSchema,
  TypicalResolutionSchema,
} from "./types";

/**
 * The contract guard for typical provenance.
 *
 * Zod strips unknown keys, so a field the backend serves and this schema does
 * not name is not merely undocumented — it is *discarded* before any reader
 * sees it, silently and with a green suite. That is exactly how two ladder
 * basis values, two `sections_by_basis` counters, `facet` and every
 * `applied_filter` axis beyond category went missing between the 2026-08-24
 * release and the 2026-09-02 one.
 *
 * The literals below are hand-written from the serializer
 * (`domain/item_economics/division_serializers.py::serialize_filter_spec` and
 * `::serialize_typical_resolution`), never derived from the schema, so the two
 * can actually disagree.
 */

const EVERY_BASIS = [
  "item_properties_narrowed",
  "item_facet_narrowed",
  "item_narrowed",
  "section_wide",
  "insufficient_sample",
] as const;

describe("TypicalBasisSchema", () => {
  it.each(EVERY_BASIS)("keeps the served basis %s", (basis) => {
    expect(TypicalBasisSchema.parse(basis)).toBe(basis);
  });

  it("files an unrecognised basis as unknown, never as insufficient_sample", () => {
    // The distinction is the whole point: `insufficient_sample` asserts there
    // was no usable history, which is a claim about the data. A basis this
    // client has not shipped support for is a claim about the client.
    expect(TypicalBasisSchema.parse("item_and_upholstery_v9")).toBe("unknown");
    expect(TypicalBasisSchema.parse(undefined)).toBe("unknown");
  });
});

describe("AppliedTypicalFilterSchema", () => {
  it("keeps every axis the serializer can emit", () => {
    const served = {
      item_category_ids: ["itc_chair"],
      item_categories: [{ client_id: "itc_chair", name: "Chair" }],
      major_categories: ["seat"],
      width_cm: [40, 60],
      height_cm: [null, 120],
      depth_cm: [30, null],
      can_have_upholstery: true,
      designers: ["dsg_one", "dsg_two"],
      properties_signature: "sig-mahogany-ud",
      properties_facets: [{ upholstery: "Up & Down" }],
    };

    expect(AppliedTypicalFilterSchema.parse(served)).toEqual(served);
  });

  it("keeps a category entry whose name could not be resolved", () => {
    // A deleted category keeps its id and carries a null name, so the entry
    // count still matches `item_category_ids`.
    const parsed = AppliedTypicalFilterSchema.parse({
      item_category_ids: ["itc_gone"],
      item_categories: [{ client_id: "itc_gone", name: null }],
    });

    expect(parsed?.item_categories).toEqual([
      { client_id: "itc_gone", name: null },
    ]);
  });

  it("omits inactive axes rather than nulling them", () => {
    const parsed = AppliedTypicalFilterSchema.parse({
      item_category_ids: ["itc_chair"],
    });

    expect(Object.keys(parsed ?? {})).toEqual(["item_category_ids"]);
  });

  it("is null when the task narrows on nothing", () => {
    expect(AppliedTypicalFilterSchema.parse(null)).toBeNull();
  });
});

describe("TypicalResolutionSchema", () => {
  it("keeps the full facet-ladder resolution intact", () => {
    const served = {
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
    };

    expect(TypicalResolutionSchema.parse(served)).toEqual(served);
  });

  it("counts every basis, so the breakdown can sum to the participating count", () => {
    const parsed = TypicalResolutionSchema.parse({
      task_typical_basis: "item_narrowed_uniform",
      reconciliation_method: "uniform_basis_v1",
      comparability_profile: "primary_item_category_v1",
      applied_filter: null,
      facet: null,
      participating_section_count: 5,
      sections_by_basis: {
        item_properties_narrowed: 1,
        item_facet_narrowed: 1,
        item_narrowed: 2,
        section_wide: 1,
        insufficient_sample: 0,
      },
    });

    const total = Object.values(parsed.sections_by_basis).reduce(
      (sum, count) => sum + count,
      0,
    );
    expect(total).toBe(parsed.participating_section_count);
  });

  it("degrades a malformed object to the serializer's documented fallback", () => {
    expect(TypicalResolutionSchema.parse("not an object")).toEqual(
      DEFAULT_TYPICAL_RESOLUTION,
    );
  });

  it("defaults facet to null rather than dropping the key", () => {
    const parsed = TypicalResolutionSchema.parse({
      task_typical_basis: "section_wide_uniform",
      reconciliation_method: "uniform_basis_v1",
      comparability_profile: "primary_item_category_v1",
      applied_filter: null,
      participating_section_count: 0,
      sections_by_basis: {
        item_properties_narrowed: 0,
        item_facet_narrowed: 0,
        item_narrowed: 0,
        section_wide: 0,
        insufficient_sample: 0,
      },
    });

    expect(parsed.facet).toBeNull();
  });
});
