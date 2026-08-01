import { useCallback, useMemo } from "react";
import { AuthRole, useRole } from "@beyo/auth";
import { useSurface } from "@beyo/hooks";
import {
  REASSIGNED_STEPS_SLIDE_SURFACE_ID,
  useReassignedStepsCountQuery,
  type ReassignedStepsHostAdapter,
  type ReassignedStepsSlideSurfaceProps,
} from "@beyo/task-working-sections";
import { useMyCurrentShiftQuery, type CurrentShift } from "@beyo/worker-shifts";
import { WORKER_STATE_SHEET_SURFACE_ID } from "../surface-ids";

export type WorkerStateIconKind =
  | "working"
  | "idle"
  | "paused"
  | "not_clocked_in";

export type WorkerStateCardViewModel = {
  label: string;
  iconKind: WorkerStateIconKind;
  /**
   * Catalog pause-reason artwork when the backend supplied one. Always `null`
   * for the code-owned transition reasons (`shift_ended`, …) — handoff §12.3 —
   * so the icon slot must fall back to `iconKind`.
   */
  imageUrl: string | null;
  /** Server timestamp the live timer anchors to; never a fetch time. */
  timerStartedAtIso: string | null;
  isClockedIn: boolean;
};

export function toWorkerStateCardViewModel(
  shift: CurrentShift,
): WorkerStateCardViewModel {
  if (!shift.clocked_in) {
    return {
      // Short enough to survive the half-width card; mirrors the kiosk's
      // clock-in / clock-out vocabulary.
      label: "Clocked out",
      iconKind: "not_clocked_in",
      imageUrl: null,
      timerStartedAtIso: null,
      isClockedIn: false,
    };
  }

  if (shift.state === "in_pause") {
    return {
      // Render `name` directly — never look the id up in a cached list.
      label: shift.pause_reason?.name ?? shift.reason_text ?? "Paused",
      iconKind: "paused",
      imageUrl: shift.pause_reason?.image_url ?? null,
      timerStartedAtIso: shift.state_entered_at,
      isClockedIn: true,
    };
  }

  if (shift.state === "working") {
    return {
      label: "Working",
      iconKind: "working",
      imageUrl: null,
      timerStartedAtIso: shift.state_entered_at,
      isClockedIn: true,
    };
  }

  return {
    label: "Idle",
    iconKind: "idle",
    imageUrl: null,
    timerStartedAtIso: shift.state_entered_at,
    isClockedIn: true,
  };
}

export function useHomeTopCardsController() {
  const { open: openSurface } = useSurface();
  const { role } = useRole();

  // The worker app admits manager-role tokens, and for those
  // `GET /worker-shifts/current` without user_id is a 403 by design
  // (handoff §12.1) — gate the call rather than swallow the error.
  const isWorkerRole = role === AuthRole.Worker;
  const shiftQuery = useMyCurrentShiftQuery(isWorkerRole);
  const countQuery = useReassignedStepsCountQuery();

  const stateCard = useMemo<WorkerStateCardViewModel | null>(
    () => (shiftQuery.data ? toWorkerStateCardViewModel(shiftQuery.data) : null),
    [shiftQuery.data],
  );

  const openStatePicker = useCallback(() => {
    openSurface(WORKER_STATE_SHEET_SURFACE_ID, {});
  }, [openSurface]);

  const openReassignedPage = useCallback(
    (adapter: ReassignedStepsHostAdapter) => {
      openSurface(REASSIGNED_STEPS_SLIDE_SURFACE_ID, {
        adapter,
      } satisfies ReassignedStepsSlideSurfaceProps);
    },
    [openSurface],
  );

  return {
    // State card — worker-role sessions only.
    showStateCard: isWorkerRole,
    stateCard,
    isStateCardPending: isWorkerRole && shiftQuery.isPending,
    isStateCardError: isWorkerRole && shiftQuery.isError,
    // Declaring while clocked out is a 409, so the picker stays shut.
    canOpenStatePicker: stateCard?.isClockedIn === true,
    openStatePicker,

    // Re-Assigned card — the badge shows every visible reassigned step, which
    // is exactly what the page lists.
    reassignedCount: countQuery.data?.total ?? 0,
    isReassignedCountPending: countQuery.isPending,
    openReassignedPage,
  };
}

export type HomeTopCardsController = ReturnType<
  typeof useHomeTopCardsController
>;
