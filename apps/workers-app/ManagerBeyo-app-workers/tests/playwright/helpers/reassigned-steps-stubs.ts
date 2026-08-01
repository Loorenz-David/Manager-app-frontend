import type { Page } from "@playwright/test";

/**
 * Route stubs for the two reassigned-steps endpoints, which are **not live**
 * (see the handoff's status table). Shapes come from §3.6 / §4 verbatim.
 */

const UPHOLSTERY_SECTION = {
  client_id: "wsec_upholstery",
  name: "Upholstery",
  image: null,
  order_list: 2,
  allows_batch_working: true,
  allows_shopify_product_modifications: false,
};

const CARPENTRY_SECTION = {
  client_id: "wsec_carpentry",
  name: "Carpentry",
  image: null,
  order_list: 1,
  allows_batch_working: false,
  allows_shopify_product_modifications: false,
};

function makeStep({
  stepId,
  sectionId,
  sectionName,
  articleNumber,
  sku,
}: {
  stepId: string;
  sectionId: string;
  sectionName: string;
  articleNumber: string;
  sku: string;
}) {
  return {
    client_id: stepId,
    task_id: `task_${stepId}`,
    state: "pending",
    readiness_status: "ready",
    sequence_order: 1,
    working_section_id: sectionId,
    assigned_worker_id: null,
    total_dependencies: 0,
    completed_dependencies: 0,
    working_section_name_snapshot: sectionName,
    assigned_worker_display_name_snapshot: null,
    created_at: "2026-07-30T14:05:11.482913+00:00",
    closed_at: null,
    ready_by_at: null,
    total_working_seconds: 0,
    total_pause_seconds: 0,
    total_ended_shift_seconds: 0,
    total_working_count: 0,
    total_pause_count: 0,
    total_ended_shift_count: 0,
    total_issues_count: 0,
    total_issues_resolved_count: 0,
    total_cost_minor: null,
    recorded_time_marked_wrong: false,
    updated_at: null,
    created_by: {
      client_id: "usr_manager",
      username: "Sara",
      profile_picture: null,
    },
    updated_by: null,
    last_state_record: {
      state: "pending",
      pause_reason: null,
      description: null,
      entered_at: "2026-07-30T14:05:11.482913+00:00",
      exited_at: null,
      last_action_by: null,
      first_started_at: null,
    },
    task: {
      client_id: `task_${stepId}`,
      task_type: "return",
      priority: "high",
      state: "working",
      return_source: "after_purchase",
      item_location: "store",
      ready_by_at: null,
      scheduled_start_at: null,
      scheduled_end_at: null,
      return_method: "pickup",
      assortment: null,
    },
    item: {
      client_id: `item_${stepId}`,
      article_number: articleNumber,
      sku,
      state: "fixing",
      item_category_id: null,
      quantity: 1,
      item_position: null,
      item_zone: null,
      upholstery_requirement: [],
    },
    item_images: [],
    cases_summary: { total_unread: 0 },
    dependency_working_sections: [],
    is_reassigned: true,
    upholstery_group_key: null,
    upholstery_group_image_url: null,
    upholstery_group_upholstery_id: null,
    upholstery_group_inventory: null,
    acknowledgment: {
      client_id: `tsa_${stepId}`,
      step_id: stepId,
      task_id: `task_${stepId}`,
      reason: "Seam needs redoing.",
      worker: null,
      created_by: null,
      first_seen_at: null,
      acknowledged_at: null,
      created_at: "2026-07-30T14:05:11.482913+00:00",
    },
  };
}

// Three items so a page size of 2 forces a real page boundary — and the second
// page adds another Upholstery step, which must merge into the existing
// container rather than opening a second one (handoff §7).
const STUB_STEPS = [
  makeStep({
    stepId: "tstp_uph_1",
    sectionId: "wsec_upholstery",
    sectionName: "Upholstery",
    articleNumber: "302.445.11",
    sku: "SOFA-3S-GREY",
  }),
  makeStep({
    stepId: "tstp_car_1",
    sectionId: "wsec_carpentry",
    sectionName: "Carpentry",
    articleNumber: "701.220.09",
    sku: "TABLE-OAK",
  }),
  makeStep({
    stepId: "tstp_uph_2",
    sectionId: "wsec_upholstery",
    sectionName: "Upholstery",
    articleNumber: "302.999.00",
    sku: "SOFA-2S-BLUE",
  }),
];

const SECTIONS: Record<string, unknown> = {
  wsec_upholstery: UPHOLSTERY_SECTION,
  wsec_carpentry: CARPENTRY_SECTION,
};

export const STUB_TOTAL = STUB_STEPS.length;

export async function stubReassignedStepsEndpoints(
  page: Page,
  { pageSize = 2 }: { pageSize?: number } = {},
): Promise<void> {
  await page.route(
    "**/api/v1/task-step-acknowledgments/reassigned-steps/count*",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            reassigned_steps_count: {
              total: STUB_TOTAL,
              unacknowledged: STUB_TOTAL,
            },
          },
        }),
      }),
  );

  await page.route(
    "**/api/v1/task-step-acknowledgments/reassigned-steps?*",
    (route) => {
      const url = new URL(route.request().url());
      const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const requestedLimit = Number(
        url.searchParams.get("limit") ?? Number.MAX_SAFE_INTEGER,
      );

      // Honour the caller's limit, but cap it at `pageSize` so a short fixture
      // still produces a real page boundary. Returning fewer rows than asked
      // for is legitimate server behaviour — what matters is that the echoed
      // `limit` below reports what was *actually* applied, because that is the
      // value the hook steps `offset` by.
      const appliedLimit = Math.min(requestedLimit, pageSize);

      const matched =
        q.length === 0
          ? STUB_STEPS
          : STUB_STEPS.filter(
              (step) =>
                step.item.article_number.toLowerCase().includes(q) ||
                step.item.sku.toLowerCase().includes(q),
            );

      const items = matched.slice(offset, offset + appliedLimit);
      const workingSections: Record<string, unknown> = {};
      for (const item of items) {
        workingSections[item.working_section_id] =
          SECTIONS[item.working_section_id];
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            steps_pagination: {
              items,
              limit: appliedLimit,
              offset,
              has_more: offset + appliedLimit < matched.length,
            },
            working_sections: workingSections,
          },
        }),
      });
    },
  );
}

/** Deterministic "clocked in, on a lunch break" shift for the state card. */
export async function stubCurrentShiftInPause(page: Page): Promise<void> {
  await page.route("**/api/v1/worker-shifts/current*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          user_id: "usr_test",
          clocked_in: true,
          shift_started_at: "2026-07-31T06:58:00+00:00",
          state: "in_pause",
          state_entered_at: "2026-07-31T09:12:00+00:00",
          pause_reason: {
            id: "par_lunch",
            name: "Lunch break",
            image_url: null,
          },
          declared_state: {
            id: "uds_7c1",
            pause_reason: {
              id: "par_lunch",
              name: "Lunch break",
              image_url: null,
            },
            description: null,
            entered_at: "2026-07-31T09:12:00+00:00",
          },
        },
      }),
    }),
  );
}
