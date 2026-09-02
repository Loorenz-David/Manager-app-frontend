/**
 * Turns the served `typical_resolution` into the one thing a reader needs: what
 * population these typical times were measured over.
 *
 * Why this is worth a surface at all — the same selection that produced the
 * displayed typical also produced the *division weights*. A stage that fell
 * back to `section_wide` did not merely get a vaguer number on screen; its
 * slice of the task budget was sized from weaker evidence than its neighbours'.
 * The strategy is therefore a fact about the budget, not a footnote about a
 * label.
 *
 * Pure: no React, no clock, no network. Both the production-time card and the
 * valuation screen build from the identical object, because the backend serves
 * this block byte-identically on every surface that carries a typical.
 */

import type {
  AppliedTypicalFilter,
  TypicalResolution,
} from "../types";

export type TypicalStrategyTone = "narrow" | "broad" | "weak";

export type TypicalStrategyDetailRow = {
  label: string;
  value: string;
};

export type TypicalStrategyViewModel = {
  /** "Same upholstery" — short enough for a pill beside a number. */
  pillLabel: string;
  tone: TypicalStrategyTone;
  sheetTitle: string;
  /** One sentence naming the population, in the reader's terms. */
  summary: string;
  /**
   * Present only when the stages disagree with the task-level answer. Names the
   * disagreement without auditing every row.
   */
  breakdownLabel: string | null;
  breakdown: TypicalStrategyDetailRow[];
  /** The filter axes, humanised. Empty when the task narrows on nothing. */
  filters: TypicalStrategyDetailRow[];
  /** Sample window and gate — the same for every basis. */
  method: TypicalStrategyDetailRow[];
};

/**
 * The task-level bases, strongest first. Kept as a lookup rather than a switch
 * so an unrecognised fifth value lands on the honest fallback instead of
 * borrowing the copy of whichever branch happened to be last.
 */
const TASK_BASIS_TONE: Record<string, TypicalStrategyTone> = {
  item_properties_narrowed_uniform: "narrow",
  item_facet_narrowed_uniform: "narrow",
  item_narrowed_uniform: "broad",
  section_wide_uniform: "weak",
};

/**
 * Owner-declared facet keys mapped to the words a user reads. Extending
 * `PROPERTY_FACET_LADDER` on the backend does not require a change here — the
 * title-case fallback keeps an unmapped rung readable — but a mapping is what
 * gives the common cases proper copy rather than a de-underscored key.
 */
const FACET_LABEL: Record<string, string> = {
  upholstery: "upholstery",
  extension_type: "extension type",
};

/** "extension_type" → "extension type"; "a+b" → "a and b". */
export function humanizeFacetName(facet: string): string {
  return facet
    .split("+")
    .map((key) => FACET_LABEL[key] ?? key.replace(/_/g, " "))
    .reduce((joined, part, index, parts) =>
      index === 0
        ? part
        : index === parts.length - 1
          ? `${joined} and ${part}`
          : `${joined}, ${part}`,
    );
}

/** The first named category, which is the only one V1 ever narrows on. */
function categoryName(filter: AppliedTypicalFilter): string | null {
  const named = filter?.item_categories?.find(
    (category) => category.name !== null,
  );

  return named?.name ?? null;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const SECTIONS_BY_BASIS_LABEL: Record<string, string> = {
  item_properties_narrowed: "Same specification",
  item_facet_narrowed: "Same facet",
  item_narrowed: "Same category",
  section_wide: "All work in the stage",
  insufficient_sample: "Not enough history",
};

/**
 * The stage-level breakdown, but only when it disagrees with the task answer.
 *
 * A uniform task is already fully described by its one-line summary, and
 * repeating "5 of 5 stages" under it is noise. A *mixed* task is the case worth
 * showing: those stages were budgeted from different evidence.
 */
function buildBreakdown(
  resolution: TypicalResolution,
): { label: string | null; rows: TypicalStrategyDetailRow[] } {
  const entries = Object.entries(resolution.sections_by_basis).filter(
    ([, count]) => count > 0,
  );

  if (entries.length <= 1) {
    return { label: null, rows: [] };
  }

  return {
    label: "Not every stage matched the same way",
    rows: entries.map(([basis, count]) => ({
      label: SECTIONS_BY_BASIS_LABEL[basis] ?? titleCase(basis.replace(/_/g, " ")),
      value: `${count} of ${resolution.participating_section_count} stages`,
    })),
  };
}

function formatRange(range: readonly (number | null)[]): string {
  const [low = null, high = null] = range;

  if (low !== null && high !== null) {
    return `${low}–${high} cm`;
  }
  if (low !== null) {
    return `${low} cm and up`;
  }
  if (high !== null) {
    return `up to ${high} cm`;
  }
  // Both bounds open still records that the dimension was known — see
  // `TypicalFilterSpec`'s note that (None, None) is not an unset dimension.
  return "any size";
}

/**
 * The filter, in the reader's terms.
 *
 * `properties_signature` is deliberately reported as a presence, never a value:
 * it is an opaque hash, and printing it would look like data the reader could
 * act on.
 */
export function buildStrategyFilters(
  filter: AppliedTypicalFilter,
): TypicalStrategyDetailRow[] {
  if (filter === null) {
    return [];
  }

  const rows: TypicalStrategyDetailRow[] = [];
  const named = categoryName(filter);
  const idCount = filter.item_category_ids?.length ?? 0;

  if (named !== null) {
    rows.push({ label: "Category", value: named });
  } else if (idCount > 0) {
    // The ids are here but no name resolved — a deleted category. Say the
    // count rather than printing an id nobody can look up.
    rows.push({
      label: "Category",
      value: idCount === 1 ? "1 category" : `${idCount} categories`,
    });
  }

  if (filter.major_categories?.length) {
    rows.push({
      label: "Type",
      value: filter.major_categories.map(titleCase).join(", "),
    });
  }

  for (const [key, label] of [
    ["width_cm", "Width"],
    ["height_cm", "Height"],
    ["depth_cm", "Depth"],
  ] as const) {
    const range = filter[key];
    if (range !== undefined) {
      rows.push({ label, value: formatRange(range) });
    }
  }

  if (filter.can_have_upholstery !== undefined) {
    rows.push({
      label: "Upholstered",
      value: filter.can_have_upholstery ? "Yes" : "No",
    });
  }

  if (filter.designers?.length) {
    rows.push({
      label: "Designer",
      value:
        filter.designers.length === 1
          ? "Same designer"
          : `${filter.designers.length} designers`,
    });
  }

  for (const facet of filter.properties_facets ?? []) {
    for (const [key, value] of Object.entries(facet)) {
      rows.push({
        label: titleCase(FACET_LABEL[key] ?? key.replace(/_/g, " ")),
        value: typeof value === "string" ? value : JSON.stringify(value),
      });
    }
  }

  if (filter.properties_signature !== undefined) {
    // Presence, not value.
    rows.push({ label: "Specification", value: "Matched in full" });
  }

  return rows;
}

export type TypicalStrategyInput = {
  resolution: TypicalResolution;
  /**
   * Nullable because production-time carries these per section rather than at
   * the task root: a task whose every section is sampleless serves no typical
   * block to read them from. Omitted rather than defaulted — a hardcoded "90
   * days" would be a claim about the server's configuration, not a reading.
   */
  windowDays: number | null;
  minSampleSize: number | null;
};

export function buildTypicalStrategy({
  resolution,
  windowDays,
  minSampleSize,
}: TypicalStrategyInput): TypicalStrategyViewModel {
  const basis = resolution.task_typical_basis;
  const named = categoryName(resolution.applied_filter);
  const category = named ?? "this category";
  const facet =
    resolution.facet === null ? null : humanizeFacetName(resolution.facet);

  let pillLabel: string;
  let summary: string;

  switch (basis) {
    case "item_properties_narrowed_uniform":
      pillLabel = "Same specification";
      summary = `Measured on past work for items in ${category} built to the same specification as this one.`;
      break;
    case "item_facet_narrowed_uniform":
      // The rung's own name is what makes this label worth having: "same
      // upholstery" tells a reader far more than "narrowed".
      pillLabel = facet === null ? "Same specification" : `Same ${facet}`;
      summary =
        facet === null
          ? `Measured on past work for closely matching items in ${category}.`
          : `Measured on past work for items in ${category} with the same ${facet} as this one.`;
      break;
    case "item_narrowed_uniform":
      pillLabel = "Same category";
      summary = `Measured on past work for other items in ${category}.`;
      break;
    case "section_wide_uniform":
      pillLabel = "All work in the stage";
      summary =
        "Measured on all past work in each stage, whatever item it was for — there was not enough history for a closer match.";
      break;
    default:
      // A basis this app version does not know. Say so rather than guessing at
      // a population, which would put a confident sentence behind an unknown.
      pillLabel = "Custom match";
      summary =
        "Measured on a population this app version does not recognise. The figures are the server's; the description is not available here.";
  }

  const { label: breakdownLabel, rows: breakdown } = buildBreakdown(resolution);

  return {
    pillLabel,
    tone: TASK_BASIS_TONE[basis] ?? "weak",
    sheetTitle: "How this typical is measured",
    summary,
    breakdownLabel,
    breakdown,
    filters: buildStrategyFilters(resolution.applied_filter),
    method: [
      ...(windowDays === null
        ? []
        : [{ label: "History window", value: `Last ${windowDays} days` }]),
      ...(minSampleSize === null
        ? []
        : [
            {
              label: "Minimum sample",
              value: `${minSampleSize} completed ${
                minSampleSize === 1 ? "job" : "jobs"
              } per stage`,
            },
          ]),
      { label: "Value used", value: "Median, not average" },
    ],
  };
}
