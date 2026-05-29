import type { StatePillVariant } from "@beyo/ui";

export const UPHOLSTERY_REQUIREMENT_STATE = [
  "missing_quantity",
  "available",
  "needs_ordering",
  "ordered",
  "in_use",
  "completed",
  "failed",
] as const;

export type UpholsteryRequirementState =
  (typeof UPHOLSTERY_REQUIREMENT_STATE)[number];

export const UPHOLSTERY_REQUIREMENT_VARIANT: Record<
  UpholsteryRequirementState,
  StatePillVariant
> = {
  missing_quantity: "warning",
  available: "success",
  needs_ordering: "warning",
  ordered: "active",
  in_use: "active",
  completed: "success",
  failed: "danger",
};

const UPHOLSTERY_REQUIREMENT_STATE_SET = new Set<string>(
  UPHOLSTERY_REQUIREMENT_STATE,
);

export function isUpholsteryRequirementState(
  value: string,
): value is UpholsteryRequirementState {
  return UPHOLSTERY_REQUIREMENT_STATE_SET.has(value);
}

export function getUpholsteryRequirementVariant(
  value: string | null | undefined,
): StatePillVariant | null {
  if (!value || !isUpholsteryRequirementState(value)) {
    return null;
  }

  return UPHOLSTERY_REQUIREMENT_VARIANT[value];
}

export function formatUpholsteryRequirementLabel(value: string): string {
  return value.replaceAll("_", " ");
}
