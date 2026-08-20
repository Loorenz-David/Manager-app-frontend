import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { useAuth } from "@beyo/auth";
import { notify, type TaskId } from "@beyo/lib";
import { useQueryClient } from "@tanstack/react-query";

import {
  useBootstrapPurchasePrice,
  PURCHASE_BOOTSTRAP_MESSAGE,
  PURCHASE_BOOTSTRAP_NO_ARTICLE_MESSAGE,
} from "../actions/use-bootstrap-purchase-price";
import {
  useCommitItemValuation,
  RECONCILIATION_NOTICE_BODY,
  RECONCILIATION_NOTICE_TITLE,
} from "../actions/use-commit-item-valuation";
import { itemEconomicsKeys } from "../api/item-economics-keys";
import { useTaskPriceScenarioQuery } from "../api/use-task-price-scenario-query";
import type {
  ItemValuationEmptyStateProps,
  ItemValuationFooterProps,
  ItemValuationFrameProps,
  ItemValuationProvenanceRowProps,
  PriceCoverageChipProps,
  PriceEditorTone,
  PriceHeadlineProps,
  PriceSliderProps,
  PurchaseBootstrapCardProps,
  WorkImpactTableProps,
} from "../components/price-editor";
import {
  resolveScreenState,
  type ItemValuationScreenState,
} from "../lib/item-valuation-screen-state";
import { resolvePricingQuantity } from "../lib/item-pricing";
import { resolveCoverage } from "../lib/price-coverage";
import {
  priceDraftReducer,
  priceToSliderFraction,
  resolveProvenanceVariant,
  sliderFractionToPrice,
  type PriceDraftState,
} from "../lib/price-draft";
import {
  allowanceSeconds,
  formatAllowanceDuration,
} from "../lib/price-scenario-math";
import { currencyDisplayCode, formatPerPiece } from "../lib/valuation-currency";
import type {
  ItemEconomicsStatus,
  PriceScenario,
  PriceScenarioDomain,
} from "../types";

/**
 * The expected sold price screen's one controller: query + draft machine +
 * screen state + coverage + both actions + the M10 staleness-guarded save, and
 * the whole view model.
 *
 * Every number the components receive is formatted here, through the phase-1
 * libs — the components import nothing from `src/lib/` and hold no payload
 * (master plan §9.4). That seam is why a rounding rule can only be wrong in one
 * place.
 */

/**
 * The reducer's seed. Every field is blank because it is overwritten by the
 * `INIT` dispatch the moment the scenario lands; phase-1's `price-draft.ts`
 * deliberately owns no such constant (1B handoff item 2).
 */
const BLANK_DRAFT_STATE: PriceDraftState = {
  draft: 0,
  lastDraft: null,
  initialDefault: null,
  savedExpected: null,
  lastEditedAt: null,
};

/** M10: older than this at the moment Save is pressed and the press refetches first. */
const STALENESS_LIMIT_MS = 60_000;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const CONFIGURATION_INCOMPLETE_MESSAGE =
  "This workspace's pricing configuration is incomplete, so there is nothing to price against yet. Fix it in the item economics settings.";

const CONFIGURATION_SAVE_REASON =
  "Saving is unavailable while the pricing configuration is incomplete.";

const TYPICAL_EMPTY_REASON = "no completed work to estimate from yet";

const NO_BAND_REASON =
  "No usable price band yet — not enough completed work to anchor one.";

function formatMonthDay(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(value);
}

/**
 * The provenance row's relative tail. Deliberately not ticking (intention §7 —
 * "only if cheap"): it re-derives on every render, which is often enough for a
 * screen whose numbers change under the user's thumb.
 */
function formatRelativeTime(atMs: number, nowMs: number): string {
  const elapsedMs = Math.max(0, nowMs - atMs);

  if (elapsedMs < MINUTE_MS) return "just now";
  if (elapsedMs < HOUR_MS) {
    const minutes = Math.floor(elapsedMs / MINUTE_MS);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (elapsedMs < 2 * DAY_MS) return "yesterday";
  if (elapsedMs < 7 * DAY_MS) {
    return `${Math.floor(elapsedMs / DAY_MS)} days ago`;
  }

  return formatMonthDay(new Date(atMs));
}

/** Whole-item minor units → the grouped major amount, without a currency code. */
function formatWholeItem(minor: number): string {
  return formatPerPiece(minor, 1);
}

/**
 * `ITEM 0000608 · DINING CHAIRS (6)` — either fragment is omitted when the
 * payload lacks it, and an absent item leaves no subtitle at all (§3.4).
 */
function resolveSubtitle(scenario: PriceScenario): string | null {
  const item = scenario.item;

  if (item === null) {
    return null;
  }

  const fragments: string[] = [];

  if (item.article_number !== null) {
    fragments.push(`ITEM ${item.article_number}`);
  }

  if (item.label !== null) {
    fragments.push(
      `${item.label.toUpperCase()} (${resolvePricingQuantity(item.quantity)})`,
    );
  }

  return fragments.length === 0 ? null : fragments.join(" · ");
}

function resolveUnboundMessage(scenario: PriceScenario): string {
  return scenario.item_binding === "mismatched"
    ? "This task points at a different item than the one its economics were computed for. Re-attach the right item before pricing it."
    : "This task has no item attached, so there is no price to set. Attach an item to the task first.";
}

function resolveBlockedMessage(status: ItemEconomicsStatus | null): string {
  switch (status) {
    case "item_missing_major_category":
      return "This item has no wood or seat category yet, so there is nothing to price against.";
    case "currency_mismatch":
      return "The item's currency and the pricing configuration's currency disagree, so nothing can be priced. Fix it in the item economics settings.";
    default:
      return CONFIGURATION_INCOMPLETE_MESSAGE;
  }
}

/** Why Save is disabled — required whenever `can_commit` is false (§1.4). */
function resolveSaveReason(scenario: PriceScenario): string {
  switch (scenario.status) {
    case "not_configured_no_cost_group":
    case "not_configured_ambiguous_cost_group":
    case "not_configured_no_basis_version":
    case "not_configured_no_cost_model_version":
      return CONFIGURATION_SAVE_REASON;
    case "item_unvalued":
      return "Price the item first — fetch its purchase price.";
    case "item_missing_purchase_cost":
      return "This item needs a purchase price before it can be committed.";
    case "item_missing_major_category":
      return "This item has no wood or seat category yet.";
    case "currency_mismatch":
      return "The item's and the configuration's currencies disagree.";
    default:
      return "This task cannot be committed right now.";
  }
}

/**
 * M6's exactness guarantee, checked rather than assumed: the handoff promises
 * every band value is a multiple of `step_minor`, and `PriceSlider` rounds the
 * step count. A band that breaks the promise would silently move every emitted
 * price by a fraction of a step, so say so in dev.
 */
function resolveStepCount(domain: PriceScenarioDomain): number {
  const span = domain.max_minor - domain.min_minor;

  if (domain.step_minor <= 0) {
    return 1;
  }

  if (import.meta.env.DEV && span % domain.step_minor !== 0) {
    console.warn(
      `[item-valuation] price band is not a whole number of steps: (${domain.max_minor} - ${domain.min_minor}) % ${domain.step_minor} !== 0`,
    );
  }

  return Math.max(1, span / domain.step_minor);
}

export type ItemValuationViewModel = {
  screenState: ItemValuationScreenState;
  // `title` feeds the surface header (owner redesign 2026-08-20: the title
  // sits beside the back arrow, not inside the frame); `subtitle` is the
  // frame's identity line.
  frame: { title: string } & Omit<
    ItemValuationFrameProps,
    "children" | "headerExtra"
  >;
  provenance: ItemValuationProvenanceRowProps | null;
  headline: PriceHeadlineProps | null;
  chip: PriceCoverageChipProps | null;
  slider: PriceSliderProps | null;
  table: WorkImpactTableProps | null;
  footer: ItemValuationFooterProps | null;
  bootstrap: PurchaseBootstrapCardProps | null;
  empty: ItemValuationEmptyStateProps | null;
  /** The formatted per-piece price, for the slider's `aria-valuetext` (r1 N7). */
  sliderValueText: string | null;
  errorMessage: string | null;
  /** Awaited by the page's pull-to-refresh, so the spinner tells the truth. */
  refetch: () => Promise<void>;
};

export function useItemValuationController(
  taskId: TaskId,
): ItemValuationViewModel {
  const query = useTaskPriceScenarioQuery(taskId);
  const queryClient = useQueryClient();
  const scenario = query.data ?? null;

  const [draftState, dispatch] = useReducer(
    priceDraftReducer,
    BLANK_DRAFT_STATE,
  );
  const { user } = useAuth();

  const [saveAbortReason, setSaveAbortReason] = useState<string | null>(null);
  const [isSavePressPending, setIsSavePressPending] = useState(false);
  /**
   * The reducer is seeded blank and `INIT`ed from an effect, so for exactly one
   * commit after the payload lands the draft is still `0`. Holding the skeleton
   * over that frame is what keeps a "0 SEK" flash off the screen — and keeps
   * every consumer from having to know the seeding order.
   */
  const [isDraftSeeded, setIsDraftSeeded] = useState(false);

  const isInitializedRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const draftRef = useRef(draftState.draft);
  draftRef.current = draftState.draft;

  /**
   * Set only by a **reconciled** commit: an unreconciled one has already shown
   * the M8 notice, and the same neutral sentence twice for one save would read
   * as two problems.
   */
  const committedPriceRef = useRef<number | null>(null);

  const bootstrapAction = useBootstrapPurchasePrice(taskId);
  const commitAction = useCommitItemValuation(taskId, (reconciled) => {
    dispatch({ type: "SAVE_OK" });

    if (reconciled) {
      committedPriceRef.current = draftRef.current;
    }
  });

  // `dataUpdatedAt` is in the deps beside `scenario` on purpose: TanStack's
  // structural sharing hands back the *same* object when a refetch changes
  // nothing, and the post-commit check below has to run on exactly that case.
  useEffect(() => {
    if (scenario === null) {
      return;
    }

    const savedExpected = scenario.saved?.expected_sale_price_minor ?? null;

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      dispatch({
        type: "INIT",
        savedExpected,
        purchaseCostMinor: scenario.saved?.purchase_cost_minor ?? null,
        domain: scenario.domain,
      });
      setIsDraftSeeded(true);
      return;
    }

    dispatch({ type: "REFETCH", savedExpected });

    const committed = committedPriceRef.current;

    if (committed !== null) {
      committedPriceRef.current = null;

      // Replica lag (r1 N6): the save was reconciled, but the read that
      // followed it still shows the old price. The draft survives on the T9
      // arm; the user is told once that what they see is the server's answer.
      if (savedExpected !== committed) {
        notify.info(RECONCILIATION_NOTICE_TITLE, RECONCILIATION_NOTICE_BODY);
      }
    }
  }, [scenario, query.dataUpdatedAt]);

  const { refetch } = query;
  const handleRefetch = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  const domain = scenario?.domain ?? null;

  const handleFractionChange = useCallback(
    (fraction: number): void => {
      if (domain === null) {
        return;
      }

      dispatch({
        type: "DRAG",
        priceMinor: sliderFractionToPrice(fraction, domain),
        now: Date.now(),
      });
    },
    [domain],
  );

  const handleBackPress = useCallback((): void => {
    dispatch({ type: "BACK", now: Date.now() });
  }, []);

  const { commit } = commitAction;

  const handleSavePress = useCallback((): void => {
    // The synchronous half of M10's "one press, at most one commit": the second
    // press of a double-tap returns before the first has even refetched.
    if (saveInFlightRef.current || scenario === null) {
      return;
    }

    saveInFlightRef.current = true;
    setSaveAbortReason(null);
    setIsSavePressPending(true);

    void (async () => {
      try {
        let fresh = scenario;

        // Read the age from the cache, not from this render's snapshot: a
        // refetch that changes nothing does not always re-render an observer,
        // and the gate has to know when the server was last actually asked.
        const lastFetchedAt =
          queryClient.getQueryState(itemEconomicsKeys.priceScenario(taskId))
            ?.dataUpdatedAt ?? query.dataUpdatedAt;

        if (Date.now() - lastFetchedAt > STALENESS_LIMIT_MS) {
          const result = await query.refetch();

          // A failed pre-commit refetch aborts the save. This is what makes the
          // keep-the-cached-editor rule of S2 safe: stale data can be looked
          // at, never committed on.
          if (result.isError || result.data === undefined) {
            setSaveAbortReason(
              "The latest numbers could not be loaded, so nothing was saved. Try again.",
            );
            return;
          }

          fresh = result.data;
        }

        if (
          !fresh.can_commit ||
          fresh.model === null ||
          resolveScreenState(fresh, "success") !== "editor"
        ) {
          setSaveAbortReason(resolveSaveReason(fresh));
          return;
        }

        await commit({ priceMinor: draftRef.current, model: fresh.model });
      } finally {
        saveInFlightRef.current = false;
        setIsSavePressPending(false);
      }
    })();
  }, [commit, query, queryClient, scenario, taskId]);

  const screenState =
    scenario !== null && !isDraftSeeded
      ? "loading"
      : resolveScreenState(
          scenario,
          query.isError ? "error" : query.isPending ? "pending" : "success",
        );

  const frame = {
    title: "Expected sold price",
    subtitle: scenario === null ? null : resolveSubtitle(scenario),
  };

  const base: ItemValuationViewModel = {
    screenState,
    frame,
    provenance: null,
    headline: null,
    chip: null,
    slider: null,
    table: null,
    footer: null,
    bootstrap: null,
    empty: null,
    sliderValueText: null,
    errorMessage: null,
    refetch: handleRefetch,
  };

  if (scenario === null) {
    return screenState === "error"
      ? {
          ...base,
          errorMessage:
            "The price scenario could not be loaded. Check your connection and try again.",
        }
      : base;
  }

  const quantity = resolvePricingQuantity(scenario.item?.quantity ?? null);
  const currencyCode = currencyDisplayCode(scenario.currency);
  const nowMs = Date.now();

  if (screenState === "unbound") {
    return { ...base, empty: { message: resolveUnboundMessage(scenario) } };
  }

  const { variant, backTargetMinor } = resolveProvenanceVariant(draftState);

  const provenance = ((): ItemValuationProvenanceRowProps => {
    const backLabel =
      backTargetMinor === null
        ? null
        : `Back to ${formatPerPiece(backTargetMinor, quantity)}`;

    if (screenState === "purchase_required") {
      return {
        avatarKind: "dash",
        label: "No price set",
        detail: "purchase price needed first",
        backLabel: null,
      };
    }

    if (variant === "unpriced-pristine") {
      return {
        avatarKind: "dash",
        label: "No price set",
        detail: "suggested from purchase price × 4",
        backLabel,
      };
    }

    if (variant === "dirty") {
      // Owner copy decision 2026-08-20: just "unsaved" — the edit happened
      // under the user's own thumb, a timestamp adds nothing.
      return {
        avatarKind: "user",
        avatarName: "You",
        avatarImageSrc: null,
        label: "You",
        detail: "unsaved",
        backLabel,
      };
    }

    const author = scenario.saved?.created_by ?? null;
    const savedAtMs =
      scenario.saved === null
        ? nowMs
        : new Date(scenario.saved.created_at).getTime();
    const savedDetail = `version · ${formatRelativeTime(savedAtMs, nowMs)}`;

    // §3.5: an unloadable author has no name to show and no relative time to
    // attribute — the row says only that a saved version exists.
    if (author === null) {
      return {
        avatarKind: "user",
        avatarName: "",
        avatarImageSrc: null,
        label: "version",
        detail: null,
        backLabel,
      };
    }

    // The "You" substitution is resolved here, never in the component:
    // `AuthUser.id` carries the signed-in user's client id.
    const isCurrentUser = user !== null && user.id === author.client_id;

    return {
      avatarKind: "user",
      avatarName: isCurrentUser ? "You" : author.username,
      avatarImageSrc: author.profile_picture,
      label: isCurrentUser ? "You" : author.username,
      detail: savedDetail,
      backLabel,
    };
  })();

  if (screenState === "purchase_required") {
    const hasArticleNumber = scenario.item?.article_number != null;

    return {
      ...base,
      provenance,
      bootstrap: {
        message: hasArticleNumber
          ? PURCHASE_BOOTSTRAP_MESSAGE
          : PURCHASE_BOOTSTRAP_NO_ARTICLE_MESSAGE,
        errorMessage: bootstrapAction.errorMessage,
        ctaLabel: "Fetch purchase price",
        isCtaDisabled: !hasArticleNumber,
        isCtaPending: bootstrapAction.isPending,
        onCtaPress: () => bootstrapAction.bootstrap(scenario),
      },
    };
  }

  if (screenState === "blocked") {
    return {
      ...base,
      provenance: { ...provenance, onBackPress: handleBackPress },
      empty: { message: resolveBlockedMessage(scenario.status) },
      footer: {
        saveLabel: "Save",
        isSaveDisabled: true,
        saveReason: saveAbortReason ?? resolveSaveReason(scenario),
        onSavePress: handleSavePress,
        suggestedLabel: null,
      },
    };
  }

  // ── S6, the editor ─────────────────────────────────────────────────────────
  // `model` is non-null here by `resolveScreenState`; the local binding is what
  // makes that visible to the typechecker.
  const model = scenario.model;

  if (model === null) {
    return {
      ...base,
      empty: { message: resolveBlockedMessage(scenario.status) },
    };
  }

  const draft = draftState.draft;
  const coverage = resolveCoverage(draft, scenario.anchors);
  const tone: PriceEditorTone = !coverage.showChip
    ? "neutral"
    : coverage.isCovered
      ? "positive"
      : "negative";

  const perPiece = formatPerPiece(draft, quantity);
  const purchaseCostMinor = scenario.saved?.purchase_cost_minor ?? null;

  const headline: PriceHeadlineProps = {
    perPiece,
    currencyCode,
    piecesLine: `× ${quantity} pieces · ${formatWholeItem(draft)} ${currencyCode} total`,
    // Per piece and total (owner round 8) — mirrors the slider's "/piece"
    // labels and the pieces line's "total".
    purchaseLine:
      purchaseCostMinor === null
        ? null
        : `purchased for ${formatPerPiece(purchaseCostMinor, quantity)}/piece · ${formatWholeItem(purchaseCostMinor)} ${currencyCode} total`,
    muted: variant === "saved-pristine",
    // Tap-to-type (owner round 5): the seed is the rounded whole-kronor
    // per-piece figure; a typed commit is the same DRAG event a slider move
    // dispatches, whole-item minor. Typed values may land off the band grid —
    // like an off-grid saved price, the slider renders clamped and the draft
    // keeps the exact figure.
    perPieceDigits: String(Math.round(draft / (100 * quantity))),
    onPerPieceCommit: (perPieceMajor) => {
      dispatch({
        type: "DRAG",
        priceMinor: perPieceMajor * 100 * quantity,
        now: Date.now(),
      });
    },
  };

  const markerMinor = coverage.markerMinor;

  const slider: PriceSliderProps =
    domain === null
      ? {
          fraction: 0,
          stepCount: 1,
          onFractionChange: handleFractionChange,
          tone,
          markerFraction: null,
          markerLabel: null,
          minLabel: "—",
          maxLabel: "—",
          disabled: true,
          disabledReason: NO_BAND_REASON,
        }
      : {
          fraction: priceToSliderFraction(draft, domain),
          stepCount: resolveStepCount(domain),
          onFractionChange: handleFractionChange,
          tone,
          markerFraction:
            markerMinor === null
              ? null
              : priceToSliderFraction(markerMinor, domain),
          markerLabel:
            markerMinor === null
              ? null
              : `suggested ${formatPerPiece(markerMinor, quantity)}/piece`,
          minLabel: `${formatPerPiece(domain.min_minor, quantity)}/piece`,
          maxLabel: `${formatPerPiece(domain.max_minor, quantity)}/piece`,
        };

  const hasTypical = scenario.typical.total_seconds > 0;

  const table: WorkImpactTableProps = {
    rowLabel: "Work on this item",
    // Never "0m" for an absent typical: a median with no sample behind it would
    // read as "this job takes no time" (handoff §5.1).
    typical: hasTypical
      ? formatAllowanceDuration(scenario.typical.total_seconds)
      : null,
    typicalReason: hasTypical ? null : TYPICAL_EMPTY_REASON,
    isTypicalEstimated: scenario.typical.is_estimated,
    atPrice: formatAllowanceDuration(allowanceSeconds(draft, model)),
    atPriceTone: tone,
  };

  const isPristine = draft === draftState.savedExpected;
  const isSavePending = isSavePressPending || commitAction.isPending;

  const footer: ItemValuationFooterProps = {
    saveLabel: `Save ${perPiece} ${currencyCode} / piece`,
    isSaveDisabled: isPristine || !scenario.can_commit,
    isSavePending,
    saveReason: scenario.can_commit
      ? saveAbortReason
      : (saveAbortReason ?? resolveSaveReason(scenario)),
    onSavePress: handleSavePress,
    suggestedLabel:
      markerMinor === null
        ? null
        : `Use suggested ${formatPerPiece(markerMinor, quantity)} ${currencyCode} / piece`,
    onSuggestedPress: () => {
      if (markerMinor === null) {
        return;
      }

      dispatch({
        type: "USE_SUGGESTED",
        priceMinor: markerMinor,
        now: Date.now(),
      });
    },
  };

  return {
    ...base,
    provenance: { ...provenance, onBackPress: handleBackPress },
    headline,
    chip: coverage.showChip
      ? {
          label: coverage.isCovered
            ? "Covers typical work"
            : "Below typical work",
          tone,
        }
      : null,
    slider,
    table,
    footer,
    sliderValueText: `${perPiece} ${currencyCode} per piece`,
  };
}

export type ItemValuationController = ReturnType<
  typeof useItemValuationController
>;
