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

/**
 * Whether the winning rung actually applied a criterion when it measured.
 *
 * `unknown` exists for a basis this app version does not recognise: claiming
 * "not used" there would be as much of an invention as claiming "used".
 */
export type TypicalStrategyCriterionStatus = "used" | "not_used" | "unknown";

export type TypicalStrategyCriterionRow = TypicalStrategyDetailRow & {
  status: TypicalStrategyCriterionStatus;
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
  /**
   * What the item *is*, humanised — never a claim that anything matched.
   *
   * `applied_filter` is the spec the server derived from the item and
   * publishes whenever the item is narrowable at all, independent of which
   * rung won. Reading it as "matched on" told a section-wide reader that their
   * typicals were narrowed to a category the search had in fact abandoned, so
   * each row instead carries the rung's own verdict.
   */
  criteria: TypicalStrategyCriterionRow[];
  /**
   * One sentence reconciling the list with the winning rung: which criteria
   * survived, and why the rest were dropped. Null when there are none to
   * qualify.
   */
  criteriaNote: string | null;
  /**
   * The item's specification, plainly and without verdicts. Empty unless the
   * filter carried a signature, since only then did any property take part.
   */
  itemProperties: TypicalStrategyDetailRow[];
  /**
   * The closing line, naming the winning basis as the thing that sized the
   * stage shares. Basis-specific because "a closer match" means nothing to a
   * reader who did not get one.
   */
  budgetNote: string;
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
 * One property, in the reader's terms.
 *
 * Keys are workspace-defined and values are trusted verbatim by the server's
 * signature — `compute_properties_signature` canonicalizes structure only — so
 * neither is a known shape and a non-string value must still render.
 */
function propertyRow(key: string, value: unknown): TypicalStrategyDetailRow {
  return {
    label: titleCase(FACET_LABEL[key] ?? key.replace(/_/g, " ")),
    value: typeof value === "string" ? value : JSON.stringify(value),
  };
}

/**
 * The item's whole specification, plainly — no verdicts.
 *
 * Its own table because the criteria list answers "what was matched on" and
 * this answers "what is this item", and the reported confusion was exactly
 * that one sheet said "Same specification" while showing a list that could not
 * add up to one.
 */
export function buildItemProperties(
  filter: AppliedTypicalFilter,
): TypicalStrategyDetailRow[] {
  if (filter?.properties === undefined) {
    return [];
  }

  return Object.entries(filter.properties).map(([key, value]) =>
    propertyRow(key, value),
  );
}

/**
 * Which rung of the ladder applies a given criterion.
 *
 * Mirrors `_typical_item_filter.py`: every rung starts from the same
 * `build_item_match` predicate — category, type, dimensions, upholstered,
 * designer — and then adds signature equality (properties), JSONB containment
 * of one facet's pairs (facet), or nothing at all (narrowed). Section-wide
 * applies no item predicate whatsoever.
 */
type CriterionTier =
  | { kind: "item" }
  | { kind: "facet"; rung: string }
  | { kind: "specification" };

type TieredRow = TypicalStrategyDetailRow & { tier: CriterionTier };

/**
 * The rung's own verdict on one criterion.
 *
 * The full-signature rung marks facets used rather than not: equal signatures
 * mean identical property snapshots, so the facet's pairs necessarily held
 * too. Every other rung is a strict subset, and anything it did not apply is
 * reported as dropped rather than left to look like a match.
 */
function criterionStatus(
  tier: CriterionTier,
  basis: string,
  winningFacet: string | null,
): TypicalStrategyCriterionStatus {
  switch (basis) {
    case "item_properties_narrowed_uniform":
      return "used";
    case "item_facet_narrowed_uniform":
      if (tier.kind === "item") {
        return "used";
      }
      // Only the rung that actually won. A lower-priority facet was never
      // reached; a higher-priority one was reached and failed.
      return tier.kind === "facet" && tier.rung === winningFacet
        ? "used"
        : "not_used";
    case "item_narrowed_uniform":
      return tier.kind === "item" ? "used" : "not_used";
    case "section_wide_uniform":
      return "not_used";
    default:
      return "unknown";
  }
}

/**
 * The filter, in the reader's terms, tagged with the rung that would apply it.
 *
 * `properties_signature` is deliberately reported as a presence, never a
 * value: it is an opaque hash, and printing it would look like data the reader
 * could act on.
 */
function buildFilterRows(filter: AppliedTypicalFilter): TieredRow[] {
  if (filter === null) {
    return [];
  }

  const rows: TieredRow[] = [];
  const item = { kind: "item" } as const;
  const named = categoryName(filter);
  const idCount = filter.item_category_ids?.length ?? 0;

  if (named !== null) {
    rows.push({ label: "Category", value: named, tier: item });
  } else if (idCount > 0) {
    // The ids are here but no name resolved — a deleted category. Say the
    // count rather than printing an id nobody can look up.
    rows.push({
      label: "Category",
      value: idCount === 1 ? "1 category" : `${idCount} categories`,
      tier: item,
    });
  }

  if (filter.major_categories?.length) {
    rows.push({
      label: "Type",
      value: filter.major_categories.map(titleCase).join(", "),
      tier: item,
    });
  }

  for (const [key, label] of [
    ["width_cm", "Width"],
    ["height_cm", "Height"],
    ["depth_cm", "Depth"],
  ] as const) {
    const range = filter[key];
    if (range !== undefined) {
      rows.push({ label, value: formatRange(range), tier: item });
    }
  }

  if (filter.can_have_upholstery !== undefined) {
    rows.push({
      label: "Upholstered",
      value: filter.can_have_upholstery ? "Yes" : "No",
      tier: item,
    });
  }

  if (filter.designers?.length) {
    rows.push({
      label: "Designer",
      value:
        filter.designers.length === 1
          ? "Same designer"
          : `${filter.designers.length} designers`,
      tier: item,
    });
  }

  for (const facet of filter.properties_facets ?? []) {
    // The rung's name is its keys joined in ladder order, which is the order
    // the server serialised them in. A rung whose name does not line up with
    // the served `facet` simply reads as not used — the safe direction, since
    // the failure mode of a mismatch is under-claiming rather than over-.
    const rung = Object.keys(facet).join("+");
    for (const [key, value] of Object.entries(facet)) {
      rows.push({ ...propertyRow(key, value), tier: { kind: "facet", rung } });
    }
  }

  if (filter.properties_signature !== undefined) {
    // Presence, not value.
    rows.push({
      label: "Specification",
      // Names the criterion; the properties table below spells out what it
      // covers, so this no longer has to stand in for values it cannot show.
      value: "Full specification",
      tier: { kind: "specification" },
    });
  }

  return rows;
}

/**
 * The item's criteria, each carrying whether the winning rung applied it.
 *
 * Derived from the served basis rather than from the filter's own presence:
 * the filter says what the server *tried*, and only the basis says what it
 * ended up measuring over.
 */
export function buildStrategyCriteria(
  filter: AppliedTypicalFilter,
  basis: string,
  winningFacet: string | null,
): TypicalStrategyCriterionRow[] {
  return buildFilterRows(filter).map(({ tier, ...row }) => ({
    ...row,
    status: criterionStatus(tier, basis, winningFacet),
  }));
}

/**
 * The one line that reconciles the list with the rung.
 *
 * Says why in the reader's terms: a stage ran short of finished jobs. That is
 * literally the mechanism — every rung test is `all(participating sections)`,
 * so ONE thin stage drops the whole task, however rich the others are. The
 * earlier copy blamed "no narrower population", which reads as the whole
 * history being thin and sends a reader looking in the wrong place.
 *
 * Written from the criteria actually produced rather than from the basis
 * alone: a task whose filter carried no signature dropped nothing when it
 * settled on the category, and telling that reader something was "dropped"
 * would be a fresh untruth in place of the one being fixed.
 */
function buildCriteriaNote(
  criteria: TypicalStrategyCriterionRow[],
  basis: string,
  facet: string | null,
): string | null {
  if (criteria.length === 0) {
    return null;
  }

  const dropped = criteria.some((row) => row.status === "not_used");

  switch (basis) {
    case "item_properties_narrowed_uniform":
      return "Every stage had enough finished jobs for this exact item.";
    case "item_facet_narrowed_uniform":
      return facet === null
        ? "Some stages had too few finished jobs for this exact item, so the match was widened."
        : `Some stages had too few finished jobs for this exact item, so the match was widened to the same ${facet}.`;
    case "item_narrowed_uniform":
      return dropped
        ? "Some stages had too few finished jobs for a closer match, so only the category was used."
        : "Every stage had enough finished jobs for this match.";
    case "section_wide_uniform":
      return "Some stages had too few finished jobs for this item, so times come from all work in each stage instead.";
    default:
      return "This app version cannot tell which of these were used.";
  }
}

/**
 * The closing line — the reason the surface exists at all.
 *
 * The same rung that produced the displayed typical produced the division
 * weights, so a reader who has just been told their match was abandoned needs
 * telling that their stage allowances were sized the same way.
 */
function buildBudgetNote(basis: string): string {
  switch (basis) {
    case "section_wide_uniform":
      return "Each stage's share of the time budget was divided on this same stage-wide history, not on anything specific to this item.";
    case "item_properties_narrowed_uniform":
    case "item_facet_narrowed_uniform":
    case "item_narrowed_uniform":
      return "";
    default:
      return "Each stage's share of the time budget was divided on this same basis, so it governs the allowances as well as the typical shown.";
  }
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
        "Measured on all past work in each stage, whatever item it was for.";
      break;
    default:
      // A basis this app version does not know. Say so rather than guessing at
      // a population, which would put a confident sentence behind an unknown.
      pillLabel = "Custom match";
      summary =
        "Measured on a population this app version does not recognise. The figures are the server's; the description is not available here.";
  }

  const { label: breakdownLabel, rows: breakdown } = buildBreakdown(resolution);
  const criteria = buildStrategyCriteria(
    resolution.applied_filter,
    basis,
    resolution.facet,
  );

  return {
    pillLabel,
    tone: TASK_BASIS_TONE[basis] ?? "weak",
    sheetTitle: "How this typical is measured",
    summary,
    breakdownLabel,
    breakdown,
    criteria,
    criteriaNote: buildCriteriaNote(criteria, basis, facet),
    itemProperties: buildItemProperties(resolution.applied_filter),
    budgetNote: buildBudgetNote(basis),
    method: [
      ...(windowDays === null
        ? []
        : [{ label: "History window", value: `Last ${windowDays} days` }]),
      ...(minSampleSize === null
        ? []
        : [
            {
              label: "Minimum sample",
              // "finished", matching the criteria note. The sheet should not
              // make a reader map two words onto one idea.
              value: `${minSampleSize} finished ${
                minSampleSize === 1 ? "job" : "jobs"
              } per stage`,
            },
          ]),
      { label: "Value used", value: "Median" },
    ],
  };
}
