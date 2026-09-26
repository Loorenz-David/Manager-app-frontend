import type { Socket } from "socket.io-client";

type ShopifyProductSyncInventoryResult =
  | {
      quantities: Array<{
        location_id: string;
        quantity: number;
        before_available?: number;
        compare_protection?: string;
        outcome: "pending" | "applied" | "failed";
        available?: number;
        shopify_error_code?: string | null;
      }>;
    }
  | {
      // One-release read bridge for socket results emitted before absolute
      // inventory became canonical.
      adjustments: Array<{
        location_id: string;
        requested_delta: number;
        outcome: "applied" | "already_applied" | "failed";
        shopify_error_code: string | null;
      }>;
    };

export type ServerToClientEvents = {
  "stock_report_item:created": (payload: { client_id: string }) => void;
  // §7 of the snapshot handoff (2026-09-26): no priority keys any more —
  // position changes arrive on the snapshot event below.
  "stock_report_item:updated": (payload: {
    client_id: string;
    quantity_requested: number | null;
    quantity_in_queue: number | null;
    quantity_in_progress: number | null;
    quantity_awaiting: number | null;
  }) => void;
  "stock_report_item:deleted": (payload: { client_id: string }) => void;
  /** `client_id` is the snapshot's id; `stock_report_item_id` names the row. */
  "stock_report_item_snapshot:updated": (payload: {
    client_id: string;
    stock_report_item_id: string;
    version_id: string;
    priority: "high" | "medium" | "low" | null;
    priority_order: number | null;
    quantity_missing: number;
    quantity_resolved: number;
  }) => void;
  "stock_report_snapshot_version:created": (payload: {
    client_id: string;
    snapshot_count: number;
  }) => void;
  "stock_report_snapshot_version:closed": (payload: {
    client_id: string;
    snapshot_count: number;
  }) => void;
  "stock_task_assignment:created": (payload: {
    client_id: string;
    stock_report_item_id: string;
    task_id: string;
    state: string;
  }) => void;
  "stock_task_assignment:state-changed": (payload: {
    client_id: string;
    stock_report_item_id: string;
    task_id: string;
    state: string;
  }) => void;
  "stock_task_assignment:deleted": (payload: {
    client_id: string;
    stock_report_item_id: string;
    task_id: string;
    state: string;
  }) => void;
  "app_update_presentation:published": (payload: {
    client_id: string;
    logical_client_id: string;
    version: number;
  }) => void;
  "app_update_presentation:archived": (payload: {
    client_id: string;
    logical_client_id: string;
    version: number;
  }) => void;
  "shopify.products.synced": (payload: {
    task_id: string;
    succeeded: Array<{ frontend_client_id: string; shop_integration_id: string; sync_item_client_id: string; requested_operation: "create" | "update"; shopify_product_id: string; shopify_variant_id: string; inventory?: ShopifyProductSyncInventoryResult }>;
    failed: Array<{ frontend_client_id: string; shop_integration_id: string; sync_item_client_id: string; requested_operation: "create" | "update"; error_code: string; error_message: string; inventory?: ShopifyProductSyncInventoryResult }>;
  }) => void;
  // Emitted once per pre-order (success AND failure) after the background worker
  // finished provisioning the Shopify product for a `shopify_preorder` task
  // section. `task_id` is the ManagerBeyo task client_id — the correlation key.
  "shopify.preorder.processed": (payload: {
    task_id: string;
    preorder_operation_id: string;
    shopify_task_id: string;
    shop_integration_id: string;
    status: "succeeded" | "failed";
    requested_operation: "create" | "update" | null;
    shopify_product_id: string | null;
    shopify_variant_id: string | null;
    shopify_media_id: string | null;
    media_status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED" | null;
    inventory: {
      quantities: Array<{
        location_id: string;
        quantity: number;
        before_available: number | null;
        compare_protection: string | null;
        outcome: string;
        available: number | null;
      }>;
    } | null;
    error_code: string | null;
    error_message: string | null;
  }) => void;
  // A task type's SKU template handed out its next number. Broadcast to the
  // workspace as part of the `task:created` batch, since the number is now
  // allocated inside task creation rather than by a standalone reserve call
  // (HANDOFF_TO_FRONTEND_sku_template_gapless_allocation_20260804 §7).
  // `client_id` is the template's id, not the task's.
  "sku_template:scalar-reserved": (payload: {
    client_id: string;
    extra?: { last_scalar: number };
  }) => void;
  "task:created": (payload: {
    client_id: string;
    working_section_ids: string[];
  }) => void;
  "task:updated": (payload: Array<{ client_id: string }>) => void;
  "task:deleted": (payload: { client_id: string }) => void;
  "task:state-changed": (
    payload: Array<{ client_id: string; new_state: string }>,
  ) => void;
  "task:step-assigned": (payload: { client_id: string; user_id: string }) => void;
  "task:step-state-changed": (
    payload: Array<{ client_id: string; new_state: string }>,
  ) => void;
  "item_economics:evaluation-committed": (payload: {
    client_id: string;
    evaluation_id: string;
  }) => void;
  "task:step-readiness-changed": (
    payload:
      | { client_id: string; new_readiness?: string }
      | { items: Array<{ client_id: string; new_readiness?: string }> },
  ) => void;
  "task:step-created": (
    payload: Array<{ client_id: string; working_section_id: string }>,
  ) => void;
  "task:step-deleted": (
    payload: Array<{ client_id: string; working_section_id: string }>,
  ) => void;
  "task:step-updated": (payload: Array<{ client_id: string }>) => void;
  "task:step-acknowledgment-created": (payload: {
    client_id: string;
    task_id: string;
    step_ids: string[];
  }) => void;
  "task:step-acknowledgment-removed": (payload: {
    client_id: string;
    task_id: string;
    step_ids: string[];
  }) => void;
  "case:created": (payload: { client_id: string }) => void;
  "case:updated": (payload: { client_id: string }) => void;
  "case:state-changed": (payload: { client_id: string; new_state: string }) => void;
  "case:participant-added": (payload: {
    client_id: string;
    unread_count: number;
  }) => void;
  "case:participant-removed": (payload: { client_id: string }) => void;
  "case:conversation-created": (payload: { client_id: string }) => void;
  "case:unread-updated": (payload: {
    client_id: string;
    unread_count: number;
  }) => void;
  "conversation:message-created": (payload: { client_id: string }) => void;
  "conversation:message-edited": (payload: { client_id: string }) => void;
  "conversation:message-deleted": (payload: { client_id: string }) => void;
  "item:created": (payload: { client_id: string }) => void;
  "item:updated": (payload: { client_id: string }) => void;
  "item:deleted": (payload: { client_id: string }) => void;
  "item:upholstery-created": (payload: { client_id: string }) => void;
  "item:upholstery-updated": (payload: { client_id: string }) => void;
  "item:upholstery-deleted": (payload: { client_id: string }) => void;
  "item:upholstery-requirement-state-changed": (payload: {
    client_id: string;
    new_state: string;
  }) => void;
  "working_section:created": (payload: { client_id: string }) => void;
  "working_section:updated": (payload: { client_id: string }) => void;
  "working_section:deleted": (payload: { client_id: string }) => void;
  "upholstery:updated": (payload: { client_id: string }) => void;
  "upholstery:deleted": (payload: { client_id: string }) => void;
  "upholstery:inventory-updated": (payload: { client_id: string }) => void;
  "upholstery:inventory-deleted": (payload: { client_id: string }) => void;
  "task:note-created": (payload: { client_id: string; note_ids: string[] }) => void;
  "task:note-updated": (payload: { client_id: string; note_id: string }) => void;
  "task:note-deleted": (payload: { client_id: string; note_id: string }) => void;
  // Customer-coordination state transitions. Each is a plain workspace event, so
  // it arrives as a single { client_id } (the coordination's client_id); fail/
  // coordinating can fire several times in quick succession (one per coordination).
  "task_customer_coordination:completed": (payload: { client_id: string }) => void;
  "task_customer_coordination:failed": (payload: { client_id: string }) => void;
  "task_customer_coordination:coordinating": (payload: {
    client_id: string;
  }) => void;
  "notification:new": (payload: { client_id: string }) => void;
  "email.entity_threads.updated": (payload: {
    workspace_id: string;
    connection_client_id: string;
    entity_type: string;
    entity_client_ids: string[];
    major_entity_type: string;
    major_entity_client_ids: string[];
    thread_client_ids: string[];
  }) => void;
  // Emitted to the requesting user's room after a background email-batch send job
  // finishes its delivery attempt. `client_id` is the job/task id (not a message or
  // task id). `request_kind` is "coordination_batch" or "batch_send". Only aggregate
  // counts are provided — per-message failures live in the DB (send_error). Retries
  // of a partially-failed batch can emit a second event for the remaining subset.
  "email_batch:delivery_completed": (payload: {
    client_id: string;
    request_kind: string;
    connection_client_id: string;
    attempted_count: number;
    sent_count: number;
    failed_count: number;
    message_ids: string[];
  }) => void;
  "user:working_sections_updated": (payload: {
    client_id: string;
    working_section_ids: string[];
  }) => void;
  // Room `user:{target_user_id}` — you only ever receive this for yourself.
  // The payload is *exactly* the `GET /worker-shifts/current` body, so it is
  // written straight into that cache rather than triggering a refetch. Clock-out
  // is not a special shape: it arrives with `clocked_in: false`, `state: null`.
  "worker-shift:state-changed": (payload: {
    user_id: string;
    clocked_in: boolean;
    shift_started_at: string | null;
    state: "idle" | "working" | "in_pause" | null;
    state_entered_at: string | null;
    pause_reason: {
      id: string;
      name: string;
      image_url: string | null;
    } | null;
    declared_state: {
      id: string;
      pause_reason: { id: string; name: string; image_url: string | null };
      description: string | null;
      entered_at: string;
    } | null;
  }) => void;
  // Room `workspace:{workspace_id}` — a signal to refetch, NOT the whole truth.
  // It deliberately carries no pause reason and no declared state (every
  // worker's device is in the workspace room, and a declaration's description is
  // free text a worker typed about themselves). `state`/`clocked_in` are safe to
  // use directly for cheap things — an online dot, a sort — but detail must come
  // from the role-gated `/worker-stats/` endpoints.
  "worker-shift:roster-changed": (payload: {
    user_id: string;
    clocked_in: boolean;
    state: "idle" | "working" | "in_pause" | null;
    state_entered_at: string | null;
  }) => void;
  "pause_reason:created": (payload: { client_id: string }) => void;
  "pause_reason:updated": (payload: { client_id: string }) => void;
  "pause_reason:deleted": (payload: { client_id: string }) => void;
};

export type ClientToServerEvents = {
  "view_entity": (payload: {
    entity_type: string;
    entity_client_id: string;
  }) => void;
  "leave_entity": (payload: {
    entity_type: string;
    entity_client_id: string;
  }) => void;
};

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
