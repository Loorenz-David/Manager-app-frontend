import type { PauseReason } from "@beyo/pause-reasons";

export type PauseReasonTransition = {
  newState: "paused" | "ended_shift";
  requiresDescription: boolean;
};

export function resolvePauseReasonTransition(
  reason: Pick<PauseReason, "slug" | "requires_description">,
): PauseReasonTransition {
  return {
    newState: reason.slug === "pause_ended_shift" ? "ended_shift" : "paused",
    requiresDescription: reason.requires_description,
  };
}
