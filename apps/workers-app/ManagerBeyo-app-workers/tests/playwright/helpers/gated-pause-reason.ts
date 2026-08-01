import type { Page } from "@playwright/test";

/**
 * Turns one **real** catalog reason into a description-gated one, by flipping
 * `requires_description` to `true` in the `GET /pause-reasons` response.
 *
 * Why this exists: the two-screen "type a description before pausing" flow is
 * real, working product behaviour, but no reason in the catalog currently sets
 * that flag — the workspace's only one (`pause_other_task_priority`) became a
 * code-owned transition reason and left the catalog. Without this the flow is
 * unreachable from a browser and its e2e coverage silently disappears.
 *
 * Why it edits an existing row instead of appending a synthetic one: the pause
 * request that follows is **real**. A made-up `pause_reason_id` is rejected by
 * the backend, the optimistic update rolls back, and the step silently returns
 * to `working` — which then breaks the *next* step of the test rather than this
 * one. Flipping a flag on a genuine row keeps the id valid, so the transition
 * actually succeeds and the assertions mean something.
 *
 * The real request still goes out (`route.fetch()`) and its real payload is the
 * base, so a broken or reshaped `GET /pause-reasons` still fails the test. One
 * boolean is changed, for this page only; nothing is persisted.
 */

/** A `personal` reason, so it also reaches the worker-state sheet's picker. */
export const GATED_REASON_SLUG = "pause_meeting";
export const GATED_REASON_TESTID = `pause-reason-option-${GATED_REASON_SLUG}`;

type PauseReasonRow = {
  slug?: string;
  requires_description?: boolean;
};

type PauseReasonsEnvelope = {
  data?: { pause_reasons?: PauseReasonRow[] };
};

export async function stubGatedPauseReason(page: Page): Promise<void> {
  await page.route("**/api/v1/pause-reasons*", async (route) => {
    const response = await route.fetch();

    if (!response.ok()) {
      // Let a genuine failure through untouched so the test sees it.
      await route.fulfill({ response });
      return;
    }

    const body = (await response.json()) as PauseReasonsEnvelope;
    const reasons = body.data?.pause_reasons;

    if (!Array.isArray(reasons)) {
      await route.fulfill({ response });
      return;
    }

    const target = reasons.find((reason) => reason.slug === GATED_REASON_SLUG);

    if (!target) {
      // Fail loudly and specifically rather than letting the test time out on a
      // missing button several assertions later.
      throw new Error(
        `stubGatedPauseReason: no catalog reason with slug "${GATED_REASON_SLUG}". ` +
          `Available: ${reasons.map((reason) => reason.slug).join(", ")}`,
      );
    }

    target.requires_description = true;

    await route.fulfill({ response, json: body });
  });
}
