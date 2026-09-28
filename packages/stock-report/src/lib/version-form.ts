import { z } from "zod";

import type {
  CreateStockReportVersionInput,
  UpdateStockReportVersionInput,
} from "../api/stock-report-api";
import type { StockReportSnapshotVersionRow, StockReportVersionState } from "../stock-report.types";
import { formatVersionDayTitle, sameInstant } from "./version-format";

/**
 * The version form's model (plan §F.2): its values, its validation and the
 * request bodies it turns into. Pure, so every rule is tested without a
 * render.
 *
 * Schedules are compared as **instants**, never as strings (projection R1):
 * the backend echoes `…+00:00` (v10 §6.7) while the form holds
 * `toISOString()`'s `….000Z`, so a string compare would call an untouched
 * schedule "changed" — a retitle would resend `scheduled_activation_at` and an
 * overdue draft would 422 `STOCK_REPORT_SCHEDULE_IN_THE_PAST` on every save.
 */

export const STOCK_VERSION_TITLE_MAX = 200;
export const SCHEDULE_IN_THE_PAST_MESSAGE = "Pick a time in the future.";

export const StockVersionFormSchema = z.object({
  state: z.enum(["draft", "active"]),
  // Trimmed first, then capped (v10 §5.8); "" = the placeholder (OC-7).
  title: z.string().trim().max(STOCK_VERSION_TITLE_MAX, `At most ${STOCK_VERSION_TITLE_MAX} characters.`),
  // `offset: true`: zod 4 rejects "+00:00" without it (R1).
  scheduledAt: z.iso.datetime({ offset: true }).nullable(),
});
export type StockVersionFormValues = z.infer<typeof StockVersionFormSchema>;

/** What the form edits, read off the stored version; `null` = create. */
export type StockVersionFormOriginal = {
  state: StockReportVersionState;
  title: string | null;
  scheduledAt: string | null;
  keepActiveMissing: boolean;
  createdAt: string;
};

export function toStockVersionFormOriginal(
  version: Pick<
    StockReportSnapshotVersionRow,
    "state" | "title" | "scheduled_activation_at" | "scheduled_activation_keeps_active_missing" | "created_at"
  >,
): StockVersionFormOriginal {
  return {
    state: version.state,
    title: version.title,
    scheduledAt: version.scheduled_activation_at,
    keepActiveMissing: version.scheduled_activation_keeps_active_missing,
    createdAt: version.created_at,
  };
}

/**
 * The form's first values. A new version starts as a draft — Active closes
 * the live version, so it is the choice a user makes, not the one they fall
 * into. An edited schedule is normalised to `toISOString()` so the form's own
 * values are one format (R1a).
 */
export function initialStockVersionFormValues(original: StockVersionFormOriginal | null): StockVersionFormValues {
  if (original === null) return { state: "draft", title: "", scheduledAt: null };
  return {
    state: original.state === "draft" ? "draft" : "active",
    title: original.title ?? "",
    scheduledAt: original.scheduledAt === null ? null : new Date(original.scheduledAt).toISOString(),
  };
}

/**
 * The refinements take the original so an untouched value never fails
 * (projection R2): an overdue draft can still be retitled, promoted and
 * unscheduled; only a **changed** instant must lie in the future.
 */
export function buildStockVersionFormSchema(
  original: StockVersionFormOriginal | null,
  now: () => number = Date.now,
) {
  return StockVersionFormSchema.refine((values) => values.state === "draft" || values.scheduledAt === null, {
    message: "Only a draft can be scheduled.",
    path: ["scheduledAt"],
  }).refine(
    (values) =>
      values.scheduledAt === null ||
      sameInstant(values.scheduledAt, original?.scheduledAt ?? null) ||
      Date.parse(values.scheduledAt) > now(),
    { message: SCHEDULE_IN_THE_PAST_MESSAGE, path: ["scheduledAt"] },
  );
}

export type StockVersionFormPlan = "create-draft" | "create-active" | "patch" | "patch-then-activate";

/**
 * What a submit does. Editing an active version never offers Draft (owner,
 * 2026-09-27), so an active original is always a plain patch — there is no
 * demotion plan.
 */
export function stockVersionFormPlan(
  values: Pick<StockVersionFormValues, "state">,
  original: StockVersionFormOriginal | null,
): StockVersionFormPlan {
  if (original === null) return values.state === "draft" ? "create-draft" : "create-active";
  if (original.state === "draft" && values.state === "active") return "patch-then-activate";
  return "patch";
}

/**
 * Which activation sheet a submit waits for (OC-16, OC-17): `"schedule"`
 * whenever the plan stores a draft with a schedule — new, moved or unchanged,
 * so the stored keep choice is always reachable; `"activate"` for a promote;
 * `null` otherwise (an unscheduled draft, an active create, an active edit).
 */
export function needsActivationChoice(
  values: StockVersionFormValues,
  original: StockVersionFormOriginal | null,
): "schedule" | "activate" | null {
  const plan = stockVersionFormPlan(values, original);
  if (plan === "patch-then-activate") return "activate";
  if ((plan === "create-draft" || plan === "patch") && values.state === "draft" && values.scheduledAt !== null) {
    return "schedule";
  }
  return null;
}

function normalisedTitle(title: string): string | null {
  const trimmed = title.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * v9 §5.8 body. A blank title stores the placeholder (OC-7), so what the user
 * saw is what the version is called. Either schedule key with `draft: false`
 * is a 422, so both are drafts-only; the keep flag only when the activation
 * sheet ran.
 */
export function toCreateStockVersionBody(
  values: StockVersionFormValues,
  placeholderTitle: string,
  keepActiveMissing?: boolean,
): CreateStockReportVersionInput {
  const title = normalisedTitle(values.title) ?? placeholderTitle;
  if (values.state !== "draft") return { draft: false, title };
  return {
    draft: true,
    title,
    ...(values.scheduledAt !== null ? { scheduledAt: values.scheduledAt } : {}),
    ...(keepActiveMissing !== undefined ? { keepActiveMissing } : {}),
  };
}

/**
 * The body an untouched create form sends: a draft, titled with the day's
 * placeholder, no schedule. The hub's **+ New Draft** sends it in one tap
 * (owner, 2026-09-28), so it is built from the form's own pieces and the two
 * cannot drift.
 */
export function newStockDraftBody(now: number = Date.now()): CreateStockReportVersionInput {
  return toCreateStockVersionBody(
    initialStockVersionFormValues(null),
    formatVersionDayTitle(new Date(now).toISOString(), now),
  );
}

/**
 * v9 §5.19 diff: only the keys that changed. A cleared title is `null` (the
 * version then shows its creation day, the placeholder the user saw). Schedule
 * keys only while the version is and stays a draft: a promote sends the title
 * alone (projection R14) — activation clears the schedule itself (v9 §5.17
 * step 5).
 */
export function toUpdateStockVersionBody(
  values: StockVersionFormValues,
  original: StockVersionFormOriginal,
  keepActiveMissing?: boolean,
): UpdateStockReportVersionInput {
  const body: UpdateStockReportVersionInput = {};
  const title = normalisedTitle(values.title);
  if (title !== original.title) body.title = title;
  if (stockVersionFormPlan(values, original) !== "patch" || original.state !== "draft") return body;
  if (!sameInstant(values.scheduledAt, original.scheduledAt)) body.scheduledAt = values.scheduledAt;
  if (keepActiveMissing !== undefined) body.keepActiveMissing = keepActiveMissing;
  return body;
}

export function hasStockVersionUpdate(body: UpdateStockReportVersionInput): boolean {
  return Object.keys(body).length > 0;
}
