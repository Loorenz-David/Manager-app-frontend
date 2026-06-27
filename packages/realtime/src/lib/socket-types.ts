import type { Socket } from "socket.io-client";

export type ServerToClientEvents = {
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
  "notification:new": (payload: { client_id: string }) => void;
  "user:working_sections_updated": (payload: {
    client_id: string;
    working_section_ids: string[];
  }) => void;
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
