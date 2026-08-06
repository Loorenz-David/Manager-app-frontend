import { caseSocketEvents } from "@beyo/cases";
import { notificationSocketEvents } from "@beyo/notifications";
import { presentationSocketEvents } from "@beyo/presentations";
import type { SocketEventHandlers } from "@beyo/realtime";
import { workerStatsSocketEvents } from "@beyo/stats";
import { taskNoteSocketEvents } from "@beyo/task-notes";
import { workingSectionSocketEvents } from "@beyo/working-sections";
import { itemSocketEvents } from "@/features/items/socket-events";
import { taskSocketEvents } from "@/features/tasks/socket-events";
import { upholsterySocketEvents } from "@/features/upholstery-inventory/socket-events";

export const socketRegistry: SocketEventHandlers = {
  ...caseSocketEvents,
  ...taskSocketEvents,
  ...taskNoteSocketEvents,
  ...itemSocketEvents,
  ...workingSectionSocketEvents,
  ...upholsterySocketEvents,
  ...notificationSocketEvents,
  ...presentationSocketEvents,
  ...workerStatsSocketEvents,
};
