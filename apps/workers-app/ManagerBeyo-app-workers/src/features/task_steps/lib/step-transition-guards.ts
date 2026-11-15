import { isResolvedUpholsteryRequirementState } from "@beyo/upholstery";

import type { TaskStep } from "../types";

export const UPHOLSTERY_SECTION_NAMES = new Set([
  "upholstery installation",
  "sewing",
]);

export function isUpholsteryWarningSection(name: string): boolean {
  return UPHOLSTERY_SECTION_NAMES.has(name.toLowerCase().trim());
}

/**
 * The item was explicitly marked as having no upholstery ("None"). Such a step has
 * nothing to wait for, so neither upholstery guard applies to it.
 */
export function isMarkedWithoutUpholstery(step: TaskStep): boolean {
  return step.item?.can_have_upholstery === false;
}

export function hasNoAvailableUpholstery(step: TaskStep): boolean {
  if (isMarkedWithoutUpholstery(step)) {
    return false;
  }
  const requirements = step.item?.upholstery_requirement ?? [];
  if (requirements.length === 0) {
    return false;
  }

  return !requirements.some((requirement) =>
    isResolvedUpholsteryRequirementState(requirement.state),
  );
}

/**
 * Upholstery is still to be assigned: the item can have upholstery but has no
 * requirement yet. An item marked "None" is not missing anything.
 */
export function hasNoUpholsterySelected(step: TaskStep): boolean {
  if (isMarkedWithoutUpholstery(step)) {
    return false;
  }
  const requirements = step.item?.upholstery_requirement ?? [];
  return requirements.length === 0;
}
