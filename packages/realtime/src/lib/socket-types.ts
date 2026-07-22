import type { Socket } from "socket.io-client";

export type ServerToClientEvents = {
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
    succeeded: Array<{ frontend_client_id: string; shop_integration_id: string; sync_item_client_id: string; requested_operation: "create" | "update"; shopify_product_id: string; shopify_variant_id: string }>;
    failed: Array<{ frontend_client_id: string; shop_integration_id: string; sync_item_client_id: string; requested_operation: "create" | "update"; error_code: string; error_message: string }>;
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
