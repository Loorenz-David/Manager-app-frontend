import type { WorkingSectionShortcutConfig } from "../types";

const PHOTOGRAPHY_PATTERN = "photography";
const INTERNAL_TASK_TYPE = "internal";

export const DEFAULT_WORKING_SECTION_SHORTCUTS: WorkingSectionShortcutConfig = {
  "Full job": [
    "disassembly",
    "cleaning",
    "structural repair",
    "sanding",
    "padding",
    "assembly",
    "upholstery",
    "photography",
  ],
  Upholstery: ["upholstery"],
  "Chair Fix": ["structural repair", "sanding", "cleaning"],
  "wood fix": [
    "wood fix",
    "ground oil",
    "hardwax oil",
    "cleaning",
    "photography",
  ],
};

const MAJOR_CATEGORY_SHORTCUT_LABELS: Record<string, string[]> = {
  seat: ["Full job", "Upholstery", "Chair Fix"],
  wood: ["wood fix"],
};

/**
 * Internal tasks are in-house work with no customer-facing deliverable, so a
 * "take a photo" finishing step is a normal part of the job. Pre-order and
 * return tasks handle photos through the item's own image step instead, so
 * bundling a photography working section into a quick-select pill for those
 * task types would assign work nobody asked for.
 */
function excludePhotographyOutsideInternal(
  config: WorkingSectionShortcutConfig,
  taskType?: string,
): WorkingSectionShortcutConfig {
  if (taskType === INTERNAL_TASK_TYPE) {
    return config;
  }

  return Object.fromEntries(
    Object.entries(config).map(([label, patterns]) => [
      label,
      patterns.filter((pattern) => pattern !== PHOTOGRAPHY_PATTERN),
    ]),
  );
}

export function resolveWorkingSectionShortcutsByMajorCategory(
  majorCategory?: string,
  taskType?: string,
): WorkingSectionShortcutConfig {
  if (!majorCategory) {
    return excludePhotographyOutsideInternal(
      DEFAULT_WORKING_SECTION_SHORTCUTS,
      taskType,
    );
  }

  const labels = MAJOR_CATEGORY_SHORTCUT_LABELS[majorCategory];
  if (!labels) {
    return excludePhotographyOutsideInternal(
      DEFAULT_WORKING_SECTION_SHORTCUTS,
      taskType,
    );
  }

  const filtered = labels.reduce<WorkingSectionShortcutConfig>((acc, label) => {
    const patterns = DEFAULT_WORKING_SECTION_SHORTCUTS[label];
    if (!patterns) {
      return acc;
    }

    acc[label] = patterns;
    return acc;
  }, {});

  return excludePhotographyOutsideInternal(filtered, taskType);
}
