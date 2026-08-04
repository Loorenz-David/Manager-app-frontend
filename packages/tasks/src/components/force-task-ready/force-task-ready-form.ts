import type { z } from "zod";

import { ForceTaskReadyInputSchema } from "../../types";

/**
 * The form owns everything the user types. `task_id` is supplied by the
 * controller at submit time, so it is omitted here rather than carried as a
 * hidden field.
 */
export const ForceTaskReadyFormSchema = ForceTaskReadyInputSchema.omit({
  task_id: true,
});

export type ForceTaskReadyFormValues = z.infer<typeof ForceTaskReadyFormSchema>;

export const FORCE_TASK_READY_DEFAULT_VALUES: ForceTaskReadyFormValues = {
  reason: "",
  // Defaults to on: closing a step out of `working` or `paused` cuts real
  // accrued time short, and the flag marks that time unreliable for analytics.
  mark_inaccurate: true,
};
