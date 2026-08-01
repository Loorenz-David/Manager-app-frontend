import { http, HttpResponse } from "msw";
import {
  REASSIGNED_CARPENTRY_SECTION,
  REASSIGNED_UPHOLSTERY_SECTION,
  makeReassignedStepItem,
  makeReassignedStepsResponse,
} from "./reassigned-steps-fixtures";

const PAGE_SIZE = 20;

// Two sections, three steps — enough to exercise grouping and the badge/list
// agreement canary (handoff §13).
const ITEMS: Array<{ item: unknown; article: string; sku: string }> = [
  {
    item: makeReassignedStepItem(),
    article: "302.445.11",
    sku: "SOFA-3S-GREY",
  },
  {
    item: makeReassignedStepItem({
      client_id: "tstp_carpentry_1",
      working_section_id: "wsec_carpentry",
      working_section_name_snapshot: "Carpentry",
      item: {
        client_id: "item_88d3",
        article_number: "701.220.09",
        sku: "TABLE-OAK",
        state: "pending",
        item_category_id: "icat_table",
        quantity: 2,
        item_position: "B-04",
        item_zone: null,
        upholstery_requirement: [],
      },
      acknowledgment: {
        client_id: "tsa_carpentry_1",
        step_id: "tstp_carpentry_1",
        reason: null,
        acknowledged_at: "2026-07-30T16:00:00+00:00",
      },
    }),
    article: "701.220.09",
    sku: "TABLE-OAK",
  },
  {
    // No primary item: returned when `q` is absent, dropped by any non-empty
    // `q` because there is nothing to match against (handoff §3.5).
    item: makeReassignedStepItem({
      client_id: "tstp_no_item",
      working_section_id: "wsec_upholstery",
      item: null,
      item_images: [],
      acknowledgment: {
        client_id: "tsa_no_item",
        step_id: "tstp_no_item",
      },
    }),
    article: "",
    sku: "",
  },
];

const SECTIONS: Record<string, unknown> = {
  wsec_upholstery: REASSIGNED_UPHOLSTERY_SECTION,
  wsec_carpentry: REASSIGNED_CARPENTRY_SECTION,
};

function success(data: unknown) {
  return HttpResponse.json({ ok: true, warnings: [], data });
}

export const reassignedStepsMockHandlers = [
  http.get(
    "*/api/v1/task-step-acknowledgments/reassigned-steps/count",
    () =>
      success({
        reassigned_steps_count: {
          total: ITEMS.length,
          unacknowledged: ITEMS.length - 1,
        },
      }),
  ),

  http.get(
    "*/api/v1/task-step-acknowledgments/reassigned-steps",
    ({ request }) => {
      const url = new URL(request.url);
      const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
      const limit = Number(url.searchParams.get("limit") ?? PAGE_SIZE);
      const offset = Number(url.searchParams.get("offset") ?? 0);

      // ILIKE '%q%' against article_number OR sku; a step with no item is
      // dropped by any non-empty q.
      const matched =
        q.length === 0
          ? ITEMS
          : ITEMS.filter(
              (entry) =>
                entry.article.toLowerCase().includes(q) ||
                entry.sku.toLowerCase().includes(q),
            );

      const page = matched.slice(offset, offset + limit);
      const sectionIds = new Set(
        page.map(
          (entry) =>
            (entry.item as { working_section_id: string }).working_section_id,
        ),
      );
      const workingSections: Record<string, unknown> = {};
      for (const id of sectionIds) {
        const section = SECTIONS[id];
        if (section !== undefined) {
          workingSections[id] = section;
        }
      }

      return success(
        makeReassignedStepsResponse({
          items: page.map((entry) => entry.item),
          workingSections,
          limit,
          offset,
          // has_more reflects the *filtered* set (handoff §3.5).
          hasMore: offset + limit < matched.length,
        }),
      );
    },
  ),
];
