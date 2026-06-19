import { caseSocketEvents } from "@beyo/cases";
import { notificationSocketEvents } from "@beyo/notifications";
import type { SocketEventHandlers } from "@beyo/realtime";
import { itemSocketEvents } from "@/features/items/socket-events";
import { taskSocketEvents } from "@/features/tasks/socket-events";
import { upholsterySocketEvents } from "@/features/upholstery/socket-events";
import { workingSectionSocketEvents } from "@/features/working-sections/socket-events";

export const socketRegistry: SocketEventHandlers = {
  ...caseSocketEvents,
  ...taskSocketEvents,
  ...itemSocketEvents,
  ...workingSectionSocketEvents,
  ...upholsterySocketEvents,
  ...notificationSocketEvents,
};
