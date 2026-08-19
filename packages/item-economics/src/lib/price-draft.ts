import type { PriceScenarioDomain } from "../types";

/**
 * The draft price state machine of the expected sold price editor.
 *
 * Contract: intention §3.5 and §4A M4/M5/M6. The draft is the whole-item minor
 * price the screen currently shows — client-only, per-open, never persisted
 * except through Save.
 *
 * Everything here is pure so the phase-2 controller can wrap `priceDraftReducer`
 * in `useReducer` without re-deriving a single rule. `now` is always injected
 * through the event; the reducer never reads a clock.
 */

export type PriceDraftState = {
  draft: number;
  lastDraft: number | null;
  initialDefault: number | null;
  /**
   * The saved expected price the draft was last reconciled against. Carried in
   * state because T8/T9 branch on the **old** value when a refetch arrives.
   */
  savedExpected: number | null;
  lastEditedAt: number | null;
};

export type PriceDraftEvent =
  | {
      type: "INIT";
      savedExpected: number | null;
      purchaseCostMinor: number | null;
      domain: PriceScenarioDomain | null;
    }
  | { type: "DRAG" | "USE_SUGGESTED"; priceMinor: number; now: number }
  | { type: "BACK"; now: number }
  | { type: "SAVE_OK" }
  | { type: "REFETCH"; savedExpected: number | null };

/** The unpriced default: the purchase cost times four (intention §3.5). */
const UNPRICED_DEFAULT_MULTIPLIER = 4;

/**
 * Place a value on the slider band (M5): clamp into `[min, max]`, snap to the
 * nearest `step` multiple with ties rounding up, then re-clamp — a tie at the
 * top edge may overshoot by one step. A null domain is the identity, because
 * with no band there is nothing to snap to and the slider is disabled anyway.
 *
 * Integer `number` arithmetic is deliberate: these are exact integers far inside
 * 2^53, and this is the placement of a handle, not the money path.
 */
export function clampSnap(
  value: number,
  domain: PriceScenarioDomain | null,
): number {
  if (domain === null) {
    return value;
  }

  const clamped = Math.min(Math.max(value, domain.min_minor), domain.max_minor);

  // A non-positive step has no grid; the clamped value is the best placement.
  if (domain.step_minor <= 0) {
    return clamped;
  }

  const snapped =
    domain.min_minor +
    Math.round((clamped - domain.min_minor) / domain.step_minor) *
      domain.step_minor;

  return Math.min(snapped, domain.max_minor);
}

/**
 * The total transition table T1–T9 of M4, and nothing else. Any event whose
 * guards all fail returns the state unchanged — the Back toggle is hidden in
 * exactly those cases (`resolveProvenanceVariant`).
 */
export function priceDraftReducer(
  state: PriceDraftState,
  event: PriceDraftEvent,
): PriceDraftState {
  switch (event.type) {
    case "INIT": {
      // T1 — a saved expected price wins, even off the band's grid: the handle
      // renders at the nearest position and the first drag snaps the draft.
      if (event.savedExpected !== null) {
        return {
          draft: event.savedExpected,
          lastDraft: null,
          initialDefault: null,
          savedExpected: event.savedExpected,
          lastEditedAt: null,
        };
      }

      // T2 — unpriced: purchase cost × 4, clamped and snapped onto the band.
      // Inside S6 a null expected price implies a non-null purchase cost
      // (operational handoff §3.1), so the `?? 0` arm is unreachable there and
      // exists only to keep the reducer total.
      const draft = clampSnap(
        (event.purchaseCostMinor ?? 0) * UNPRICED_DEFAULT_MULTIPLIER,
        event.domain,
      );

      return {
        draft,
        lastDraft: null,
        initialDefault: draft,
        savedExpected: null,
        lastEditedAt: null,
      };
    }

    // T3 — a manual edit never touches lastDraft.
    case "DRAG":
    case "USE_SUGGESTED":
      return { ...state, draft: event.priceMinor, lastEditedAt: event.now };

    case "BACK": {
      // T4 — leaving a dirty draft: remember it, return to the saved value.
      if (state.draft !== state.savedExpected && state.savedExpected !== null) {
        return {
          ...state,
          lastDraft: state.draft,
          draft: state.savedExpected,
          lastEditedAt: event.now,
        };
      }

      // T5 — the second press of the toggle: restore the abandoned draft.
      if (state.draft === state.savedExpected && state.lastDraft !== null) {
        return {
          ...state,
          draft: state.lastDraft,
          lastDraft: null,
          lastEditedAt: event.now,
        };
      }

      return state;
    }

    // T6 — a save consumes the abandoned draft; the refetch that follows
    // re-initialises the draft to the new saved value.
    case "SAVE_OK":
      return { ...state, lastDraft: null };

    case "REFETCH": {
      // T7 — the saved value did not move: draft and lastDraft survive intact.
      if (event.savedExpected === state.savedExpected) {
        return state;
      }

      const wasPristine = state.draft === state.savedExpected;

      // T8 — someone else saved while this screen was pristine: adopt it.
      if (wasPristine && event.savedExpected !== null) {
        return {
          ...state,
          draft: event.savedExpected,
          savedExpected: event.savedExpected,
        };
      }

      // T9 — the draft is dirty (or the saved value vanished): the user's work
      // survives, and the provenance row re-derives from the new saved value.
      return { ...state, savedExpected: event.savedExpected };
    }
  }
}

export type PriceDraftProvenanceVariant =
  | "unpriced-pristine"
  | "saved-pristine"
  | "dirty";

/**
 * The provenance row's variant and its Back-to-N target — a pure function of
 * state, never stored (M4, intention §3.5).
 *
 * `backTargetMinor === null` means the toggle is hidden: it renders exactly when
 * T4's or T5's guard holds, so the button can never be pressed into a no-op.
 */
export function resolveProvenanceVariant(state: PriceDraftState): {
  variant: PriceDraftProvenanceVariant;
  backTargetMinor: number | null;
} {
  const variant: PriceDraftProvenanceVariant =
    state.savedExpected === null &&
    state.draft === state.initialDefault &&
    state.lastDraft === null
      ? "unpriced-pristine"
      : state.savedExpected !== null && state.draft === state.savedExpected
        ? "saved-pristine"
        : "dirty";

  // T4's guard: a dirty draft with somewhere to go back to.
  if (state.draft !== state.savedExpected && state.savedExpected !== null) {
    return { variant, backTargetMinor: state.savedExpected };
  }

  // T5's guard: sitting on the saved value with an abandoned draft to restore.
  if (state.draft === state.savedExpected && state.lastDraft !== null) {
    return { variant, backTargetMinor: state.lastDraft };
  }

  return { variant, backTargetMinor: null };
}

/**
 * The band's step count. Exact by the handoff's multiples guarantee (§5.4):
 * every band value is a multiple of `step_minor`.
 */
function resolveStepCount(domain: PriceScenarioDomain): number {
  if (domain.step_minor <= 0) {
    return 0;
  }

  return (domain.max_minor - domain.min_minor) / domain.step_minor;
}

function clampFraction(fraction: number): number {
  return Math.min(Math.max(fraction, 0), 1);
}

/** Slider fraction ∈ [0,1] → the whole-item minor price on the grid (M6). */
export function sliderFractionToPrice(
  fraction: number,
  domain: PriceScenarioDomain,
): number {
  const steps = resolveStepCount(domain);

  if (steps <= 0) {
    return domain.min_minor;
  }

  return (
    domain.min_minor +
    Math.round(clampFraction(fraction) * steps) * domain.step_minor
  );
}

/**
 * Whole-item minor price → the handle's position (M6). Display only: rendering
 * an off-grid saved price never rewrites the draft it came from.
 */
export function priceToSliderFraction(
  priceMinor: number,
  domain: PriceScenarioDomain,
): number {
  const span = domain.max_minor - domain.min_minor;

  if (span <= 0) {
    return 0;
  }

  return clampFraction((priceMinor - domain.min_minor) / span);
}
