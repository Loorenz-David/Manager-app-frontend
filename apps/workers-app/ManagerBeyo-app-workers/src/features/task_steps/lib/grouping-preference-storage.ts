import { z } from "zod";

export const WORKING_SECTION_STEPS_GROUP_BY_UPHOLSTERY_STORAGE_KEY =
  "beyo.workingSectionSteps.groupByUpholstery";

const Schema = z.object({
  enabled: z.boolean(),
  updatedAt: z.number().int(),
});

export function readWorkingSectionStepsGroupByUpholstery(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(
    WORKING_SECTION_STEPS_GROUP_BY_UPHOLSTERY_STORAGE_KEY,
  );
  if (!raw) return false;
  try {
    const parsed = Schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.enabled : false;
  } catch {
    return false;
  }
}

export function writeWorkingSectionStepsGroupByUpholstery(
  enabled: boolean,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    WORKING_SECTION_STEPS_GROUP_BY_UPHOLSTERY_STORAGE_KEY,
    JSON.stringify({ enabled, updatedAt: Date.now() }),
  );
}
