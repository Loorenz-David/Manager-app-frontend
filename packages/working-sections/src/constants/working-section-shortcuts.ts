import type { WorkingSectionShortcutConfig } from "../types";

export const DEFAULT_WORKING_SECTION_SHORTCUTS: WorkingSectionShortcutConfig = {
  "Full job": [
    "disassembly",
    "cleaning",
    "structural repair",
    "sanding",
    "padding",
    "assembly",
    "upholstery",
  ],
  Upholstery: ["upholstery"],
  "Chair Fix": ["structural repair", "sanding", "cleaning"],
  "wood fix": ["wood fix", "ground oil", "hardwax oil", "cleaning"],
};

const MAJOR_CATEGORY_SHORTCUT_LABELS: Record<string, string[]> = {
  seat: ["Full job", "Upholstery", "Chair Fix"],
  wood: ["wood fix"],
};

export function resolveWorkingSectionShortcutsByMajorCategory(
  majorCategory?: string,
): WorkingSectionShortcutConfig {
  if (!majorCategory) {
    return DEFAULT_WORKING_SECTION_SHORTCUTS;
  }

  const labels = MAJOR_CATEGORY_SHORTCUT_LABELS[majorCategory];
  if (!labels) {
    return DEFAULT_WORKING_SECTION_SHORTCUTS;
  }

  return labels.reduce<WorkingSectionShortcutConfig>((acc, label) => {
    const patterns = DEFAULT_WORKING_SECTION_SHORTCUTS[label];
    if (!patterns) {
      return acc;
    }

    acc[label] = patterns;
    return acc;
  }, {});
}
