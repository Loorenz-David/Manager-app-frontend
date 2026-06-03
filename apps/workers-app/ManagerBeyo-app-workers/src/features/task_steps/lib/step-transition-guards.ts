import type { TaskStep } from "../types";

export const UPHOLSTERY_SECTION_NAMES = new Set([
  "upholstery installation",
  "sewing",
]);

export function isUpholsteryWarningSection(name: string): boolean {
  return UPHOLSTERY_SECTION_NAMES.has(name.toLowerCase().trim());
}

export function hasNoAvailableUpholstery(step: TaskStep): boolean {
  const requirements = step.item?.upholstery_requirement ?? [];
  if (requirements.length === 0) {
    return false;
  }

  return !requirements.some((requirement) => requirement.state === "available");
}
