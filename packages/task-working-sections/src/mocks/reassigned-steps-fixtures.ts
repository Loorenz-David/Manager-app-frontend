/**
 * Build-ahead fixtures for the two reassigned-steps endpoints. Copied from
 * `HANDOFF_TO_FRONTEND_reassigned_steps_endpoints_20260731.md` §3.6 / §4 —
 * neither endpoint is live yet, so this shape is the contract.
 *
 * Deliberately untyped raw JSON: these exist to prove the Zod schemas accept
 * exactly what the backend promises, so typing them would defeat the point.
 */

export const REASSIGNED_STEP_RICH_ITEM: unknown = {
  client_id: "tstp_9f3a1c",
  task_id: "task_44b1de",
  state: "pending",
  readiness_status: "ready",
  sequence_order: 3,
  working_section_id: "wsec_upholstery",
  assigned_worker_id: "usr_mykola",
  total_dependencies: 2,
  completed_dependencies: 2,
  working_section_name_snapshot: "Upholstery",
  assigned_worker_display_name_snapshot: "Mykola",
  created_at: "2026-07-30T14:05:11.482913+00:00",
  closed_at: null,
  ready_by_at: "2026-08-02T12:00:00+00:00",
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
    profile_picture: "https://cdn.example.com/u/sara.jpg",
  },
  updated_by: null,
  last_state_record: {
    state: "pending",
    pause_reason: null,
    description: null,
    entered_at: "2026-07-30T14:05:11.482913+00:00",
    exited_at: null,
    last_action_by: {
      client_id: "usr_manager",
      username: "Sara",
      profile_picture: "https://cdn.example.com/u/sara.jpg",
    },
    first_started_at: "2026-07-30T14:05:11.482913+00:00",
  },
  task: {
    client_id: "task_44b1de",
    task_type: "return",
    priority: "high",
    state: "working",
    return_source: "after_purchase",
    item_location: "store",
    ready_by_at: "2026-08-02T12:00:00+00:00",
    scheduled_start_at: null,
    scheduled_end_at: null,
    return_method: "pickup",
    assortment: "SOFA-3S",
  },
  item: {
    client_id: "item_77c2",
    article_number: "302.445.11",
    sku: "SOFA-3S-GREY",
    state: "fixing",
    item_category_id: "icat_sofa",
    quantity: 1,
    item_position: "A-12",
    item_zone: "Warehouse North",
    upholstery_requirement: [
      {
        client_id: "iur_1a",
        item_upholstery_id: "iuph_5b",
        upholstery_id: "uph_grey_linen",
        state: "available",
        source: "inventory",
        amount_meters: 3.5,
      },
    ],
  },
  item_images: [
    {
      client_id: "img_aa11",
      image_url: "https://cdn.example.com/i/aa11.jpg",
      storage_provider: "s3",
      source_type: "upload",
      source_reference: null,
      width_px: 1600,
      height_px: 1200,
      file_size_bytes: 384210,
      created_at: "2026-07-12T09:14:00+00:00",
      last_event: {
        client_id: "imev_9x",
        event_type: "processed",
        state: "succeeded",
        created_at: "2026-07-12T09:14:30+00:00",
        last_error: null,
      },
      events: [],
      image_annotation: null,
    },
    {
      client_id: "img_bb22",
      image_url: "https://cdn.example.com/i/bb22.jpg",
      width_px: 1600,
      height_px: 1200,
      file_size_bytes: 291044,
    },
  ],
  cases_summary: { total_unread: 2 },
  dependency_working_sections: [
    {
      working_section: {
        client_id: "wsec_carpentry",
        name: "Carpentry",
        image: "https://cdn.example.com/ws/carpentry.png",
        order_list: 1,
        allows_batch_working: false,
        allows_shopify_product_modifications: false,
      },
      prerequisite_step_state: "completed",
    },
  ],
  is_reassigned: true,
  upholstery_group_key: null,
  upholstery_group_image_url: null,
  upholstery_group_upholstery_id: null,
  upholstery_group_inventory: null,

  acknowledgment: {
    client_id: "tsa_31f7",
    step_id: "tstp_9f3a1c",
    task_id: "task_44b1de",
    reason: "Customer called — the left armrest seam needs redoing.",
    worker: {
      client_id: "usr_mykola",
      username: "Mykola",
      profile_picture: "https://cdn.example.com/u/mykola.jpg",
    },
    created_by: {
      client_id: "usr_manager",
      username: "Sara",
      profile_picture: "https://cdn.example.com/u/sara.jpg",
    },
    first_seen_at: "2026-07-30T15:02:00+00:00",
    acknowledged_at: null,
    created_at: "2026-07-30T14:05:11.482913+00:00",
  },
};

export const REASSIGNED_UPHOLSTERY_SECTION: unknown = {
  client_id: "wsec_upholstery",
  name: "Upholstery",
  image: "https://cdn.example.com/ws/upholstery.png",
  order_list: 2,
  allows_batch_working: true,
  allows_shopify_product_modifications: false,
};

export const REASSIGNED_CARPENTRY_SECTION: unknown = {
  client_id: "wsec_carpentry",
  name: "Carpentry",
  image: "https://cdn.example.com/ws/carpentry.png",
  order_list: 1,
  allows_batch_working: false,
  allows_shopify_product_modifications: false,
};

/** A section with no `order_list` — must sort last (handoff §7). */
export const REASSIGNED_UNORDERED_SECTION: unknown = {
  client_id: "wsec_zeta",
  name: "Zeta",
  image: null,
  order_list: null,
  allows_batch_working: false,
  allows_shopify_product_modifications: false,
};

type Overrides = Record<string, unknown>;

/** Clones the §3.6 item and shallow-merges overrides onto it. */
export function makeReassignedStepItem(overrides: Overrides = {}): unknown {
  const base = structuredClone(REASSIGNED_STEP_RICH_ITEM) as Overrides;
  const { acknowledgment, ...rest } = overrides;

  return {
    ...base,
    ...rest,
    acknowledgment: {
      ...(base.acknowledgment as Overrides),
      ...((acknowledgment as Overrides | undefined) ?? {}),
    },
  };
}

export function makeReassignedStepsResponse({
  items,
  workingSections,
  limit = 20,
  offset = 0,
  hasMore = false,
}: {
  items: unknown[];
  workingSections: Record<string, unknown>;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
}): unknown {
  return {
    steps_pagination: { items, limit, offset, has_more: hasMore },
    working_sections: workingSections,
  };
}

export const EMPTY_REASSIGNED_STEPS_RESPONSE: unknown = {
  steps_pagination: { items: [], limit: 50, offset: 0, has_more: false },
  working_sections: {},
};

export const REASSIGNED_STEPS_COUNT_RESPONSE: unknown = {
  reassigned_steps_count: { total: 7, unacknowledged: 3 },
};
