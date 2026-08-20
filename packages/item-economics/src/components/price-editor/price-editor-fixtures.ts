/**
 * The closed 13-variant fixture set (phase-1 plan, Track 1A task 2 /
 * criterion 51). Every value is a hand-formatted display string — fixtures
 * import nothing from `src/lib/` or `src/types.ts`, which is exactly the
 * point: the components must be fully drivable without the machinery.
 *
 * Numbers trace to the plan's Reference payload and the four design mockups.
 * Note the band top is "2 750/piece", not the mockup's 2 700 — the band is
 * derived and the handoff (§5.4) mandates rendering the ends as given.
 */

import type { ItemValuationEmptyStateProps } from "./ItemValuationEmptyState";
import type { ItemValuationFooterProps } from "./ItemValuationFooter";
import type { ItemValuationProvenanceRowProps } from "./ItemValuationProvenanceRow";
import type { PriceCoverageChipProps } from "./PriceCoverageChip";
import type { PriceHeadlineProps } from "./PriceHeadline";
import type { PriceSliderProps } from "./PriceSlider";
import type { WorkImpactTableProps } from "./WorkImpactTable";

const noop = (): void => {};

export type PriceEditorFixtureName =
  | "editor-saved-pristine"
  | "editor-dirty"
  | "editor-unpriced-pristine"
  | "purchase-required"
  | "purchase-required-no-article"
  | "bootstrap-pending"
  | "bootstrap-error"
  | "blocked"
  | "unbound"
  | "editor-no-band"
  | "editor-non-fundable"
  | "editor-empty-typical"
  | "editor-cannot-commit";

export type PriceEditorFixture = {
  name: PriceEditorFixtureName;
  /**
   * `title` feeds the surface header (set by the page, beside the back arrow —
   * owner redesign 2026-08-20); `subtitle` is the frame's identity line.
   */
  frame: { title: string; subtitle: string | null };
  provenance?: ItemValuationProvenanceRowProps;
  headline?: PriceHeadlineProps;
  chip?: PriceCoverageChipProps;
  slider?: PriceSliderProps;
  table?: WorkImpactTableProps;
  footer?: ItemValuationFooterProps;
  bootstrap?: {
    message: string;
    errorMessage?: string | null;
    ctaLabel: string;
    isCtaDisabled: boolean;
    isCtaPending?: boolean;
    onCtaPress: () => void;
  };
  empty?: ItemValuationEmptyStateProps;
};

const FRAME: PriceEditorFixture["frame"] = {
  title: "Expected sold price",
  subtitle: "ITEM 0000608 · DINING CHAIRS (6)",
};

// Standard band from the reference payload: 420 000…1 650 000, step 15 000,
// per-piece ends 700 / 2 750 at quantity 6, steps = 82.
const SLIDER_BASE: Omit<PriceSliderProps, "fraction" | "tone"> = {
  stepCount: 82,
  onFractionChange: noop,
  markerFraction: 795000 / 1230000, // suggested 1 215 000
  markerLabel: "suggested 2 025/piece",
  minLabel: "700/piece",
  maxLabel: "2 750/piece",
};

const TABLE_BASE: Omit<WorkImpactTableProps, "atPrice" | "atPriceTone"> = {
  rowLabel: "Work on this item",
  typical: "3h 25m",
  typicalReason: null,
};

const EDITOR_DIRTY: PriceEditorFixture = {
  name: "editor-dirty",
  frame: FRAME,
  provenance: {
    avatarKind: "user",
    avatarName: "You",
    label: "You",
    detail: "unsaved change · just now",
    backLabel: "Back to 1 625",
    onBackPress: noop,
  },
  headline: {
    perPiece: "2 225",
    currencyCode: "SEK",
    piecesLine: "× 6 pieces · 13 350 SEK total",
    purchaseLine: "purchase price 2 850 SEK",
  },
  chip: { label: "Covers typical work", tone: "positive" },
  slider: {
    ...SLIDER_BASE,
    fraction: (1335000 - 420000) / 1230000,
    tone: "positive",
  },
  table: { ...TABLE_BASE, atPrice: "3h 46m", atPriceTone: "positive" },
  footer: {
    saveLabel: "Save 2 225 SEK / piece",
    isSaveDisabled: false,
    onSavePress: noop,
    suggestedLabel: "Use suggested 2 025 SEK / piece",
    onSuggestedPress: noop,
  },
};

export const PRICE_EDITOR_FIXTURES: Record<
  PriceEditorFixtureName,
  PriceEditorFixture
> = {
  "editor-saved-pristine": {
    name: "editor-saved-pristine",
    frame: FRAME,
    provenance: {
      avatarKind: "user",
      avatarName: "You",
      label: "You",
      detail: "saved version · just now",
      backLabel: "Back to 1 675",
      onBackPress: noop,
    },
    headline: {
      perPiece: "1 625",
      currencyCode: "SEK",
      piecesLine: "× 6 pieces · 9 750 SEK total",
      purchaseLine: "purchase price 2 850 SEK",
      muted: true,
    },
    chip: { label: "Below typical work", tone: "negative" },
    slider: {
      ...SLIDER_BASE,
      fraction: (975000 - 420000) / 1230000,
      tone: "negative",
    },
    // 975 000 → 9 900 s → exactly 165 min (review r1 S1: the mockup's "2h 44m"
    // predates the reference model; the contracted arithmetic wins, as with the
    // band end).
    table: { ...TABLE_BASE, atPrice: "2h 45m", atPriceTone: "negative" },
    footer: {
      saveLabel: "Save 1 625 SEK / piece",
      isSaveDisabled: true,
      onSavePress: noop,
      suggestedLabel: "Use suggested 2 025 SEK / piece",
      onSuggestedPress: noop,
    },
  },

  "editor-dirty": EDITOR_DIRTY,

  "editor-unpriced-pristine": {
    name: "editor-unpriced-pristine",
    frame: FRAME,
    provenance: {
      avatarKind: "dash",
      label: "No price set",
      detail: "suggested from purchase price × 4",
      backLabel: null,
    },
    headline: {
      perPiece: "1 900",
      currencyCode: "SEK",
      piecesLine: "× 6 pieces · 11 400 SEK total",
      purchaseLine: "purchase price 2 850 SEK",
    },
    chip: { label: "Below typical work", tone: "negative" },
    slider: {
      ...SLIDER_BASE,
      fraction: (1140000 - 420000) / 1230000,
      tone: "negative",
    },
    table: { ...TABLE_BASE, atPrice: "3h 13m", atPriceTone: "negative" },
    footer: {
      saveLabel: "Save 1 900 SEK / piece",
      isSaveDisabled: false,
      onSavePress: noop,
      suggestedLabel: "Use suggested 2 025 SEK / piece",
      onSuggestedPress: noop,
    },
  },

  "purchase-required": {
    name: "purchase-required",
    frame: FRAME,
    provenance: {
      avatarKind: "dash",
      label: "No price set",
      detail: "purchase price needed first",
      backLabel: null,
    },
    bootstrap: {
      message:
        "No purchase price on this item yet, so there is nothing to price against.",
      ctaLabel: "Fetch purchase price",
      isCtaDisabled: false,
      onCtaPress: noop,
    },
  },

  "purchase-required-no-article": {
    name: "purchase-required-no-article",
    frame: FRAME,
    provenance: {
      avatarKind: "dash",
      label: "No price set",
      detail: "purchase price needed first",
      backLabel: null,
    },
    bootstrap: {
      message:
        "This item has no article number yet. Set one via Change article number, then fetch the purchase price.",
      ctaLabel: "Fetch purchase price",
      isCtaDisabled: true,
      onCtaPress: noop,
    },
  },

  "bootstrap-pending": {
    name: "bootstrap-pending",
    frame: FRAME,
    provenance: {
      avatarKind: "dash",
      label: "No price set",
      detail: "purchase price needed first",
      backLabel: null,
    },
    bootstrap: {
      message:
        "No purchase price on this item yet, so there is nothing to price against.",
      ctaLabel: "Fetch purchase price",
      isCtaDisabled: false,
      isCtaPending: true,
      onCtaPress: noop,
    },
  },

  "bootstrap-error": {
    name: "bootstrap-error",
    frame: FRAME,
    provenance: {
      avatarKind: "dash",
      label: "No price set",
      detail: "purchase price needed first",
      backLabel: null,
    },
    bootstrap: {
      message:
        "No purchase price on this item yet, so there is nothing to price against.",
      errorMessage:
        "The item was not found — it must first be created on the purchase application.",
      ctaLabel: "Fetch purchase price",
      isCtaDisabled: false,
      onCtaPress: noop,
    },
  },

  blocked: {
    name: "blocked",
    frame: FRAME,
    empty: {
      message:
        "This workspace's pricing configuration is incomplete, so there is nothing to price against yet. Fix it in the item economics settings.",
    },
    footer: {
      saveLabel: "Save",
      isSaveDisabled: true,
      saveReason: "Saving is unavailable while the pricing configuration is incomplete.",
      onSavePress: noop,
      suggestedLabel: null,
    },
  },

  unbound: {
    name: "unbound",
    frame: { ...FRAME, subtitle: null },
    empty: {
      message:
        "This task has no item attached, so there is no price to set. Attach an item to the task first.",
    },
  },

  "editor-no-band": {
    name: "editor-no-band",
    frame: FRAME,
    provenance: EDITOR_DIRTY.provenance,
    headline: EDITOR_DIRTY.headline,
    chip: EDITOR_DIRTY.chip,
    slider: {
      ...SLIDER_BASE,
      fraction: (1335000 - 420000) / 1230000,
      tone: "positive",
      disabled: true,
      disabledReason:
        "No usable price band yet — not enough completed work to anchor one.",
    },
    table: EDITOR_DIRTY.table,
    footer: EDITOR_DIRTY.footer,
  },

  "editor-non-fundable": {
    name: "editor-non-fundable",
    frame: FRAME,
    provenance: EDITOR_DIRTY.provenance,
    headline: EDITOR_DIRTY.headline,
    // No chip: anchors are not fundable (intention §3.2 / §4A M7).
    slider: {
      ...SLIDER_BASE,
      fraction: (1335000 - 420000) / 1230000,
      tone: "neutral",
      markerFraction: null,
      markerLabel: null,
    },
    table: EDITOR_DIRTY.table,
    footer: {
      saveLabel: "Save 2 225 SEK / piece",
      isSaveDisabled: false,
      onSavePress: noop,
      suggestedLabel: null,
    },
  },

  "editor-empty-typical": {
    name: "editor-empty-typical",
    frame: FRAME,
    provenance: EDITOR_DIRTY.provenance,
    headline: EDITOR_DIRTY.headline,
    slider: {
      ...SLIDER_BASE,
      fraction: (1335000 - 420000) / 1230000,
      tone: "neutral",
      markerFraction: null,
      markerLabel: null,
    },
    table: {
      rowLabel: "Work on this item",
      typical: null,
      typicalReason: "no completed work to estimate from yet",
      isTypicalEstimated: true,
      atPrice: "3h 46m",
      atPriceTone: "neutral",
    },
    footer: EDITOR_DIRTY.footer,
  },

  "editor-cannot-commit": {
    name: "editor-cannot-commit",
    frame: FRAME,
    provenance: EDITOR_DIRTY.provenance,
    headline: EDITOR_DIRTY.headline,
    chip: EDITOR_DIRTY.chip,
    slider: EDITOR_DIRTY.slider,
    table: EDITOR_DIRTY.table,
    footer: {
      saveLabel: "Save 2 225 SEK / piece",
      isSaveDisabled: true,
      saveReason: "This task is finished — economics can no longer be committed.",
      onSavePress: noop,
      suggestedLabel: "Use suggested 2 025 SEK / piece",
      onSuggestedPress: noop,
    },
  },
};

/**
 * The estimated-typical companion for variant 12 (plan task 2, note in the
 * closed list): a *present* typical carrying the estimated marker.
 */
export const ESTIMATED_TYPICAL_TABLE: WorkImpactTableProps = {
  rowLabel: "Work on this item",
  typical: "3h 25m",
  typicalReason: null,
  isTypicalEstimated: true,
  atPrice: "3h 46m",
  atPriceTone: "positive",
};

/**
 * Provenance companions (review r1 N5): the reference payload's own author —
 * a non-current user with a profile image — and §3.5's unloadable-author row
 * (empty avatar name, copy fixed to "saved version" with no author name).
 */
export const SAVED_BY_OTHER_PROVENANCE: ItemValuationProvenanceRowProps = {
  avatarKind: "user",
  avatarName: "Marta Lind",
  avatarImageSrc: "https://example.test/profiles/marta.jpg",
  label: "Marta Lind",
  detail: "saved version · 14 Aug, 10:24",
  backLabel: null,
};

export const UNKNOWN_AUTHOR_PROVENANCE: ItemValuationProvenanceRowProps = {
  avatarKind: "user",
  avatarName: "",
  avatarImageSrc: null,
  label: "saved version",
  detail: null,
  backLabel: null,
};
