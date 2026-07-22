import { caseSocketEvents } from "@beyo/cases";
import { notificationSocketEvents } from "@beyo/notifications";
import { presentationSocketEvents } from "@beyo/presentations";
import type { SocketEventHandlers } from "@beyo/realtime";
import {
  customerCoordinationEmailSocketEvents,
  customerCoordinationSocketEvents,
} from "@beyo/task-customer-coordination";
import { taskNoteSocketEvents } from "@beyo/task-notes";
import { taskSocketEvents } from "@/features/tasks/socket-events";

export const socketRegistry: SocketEventHandlers = {
  ...caseSocketEvents,
  ...taskSocketEvents,
  ...taskNoteSocketEvents,
  ...notificationSocketEvents,
  ...presentationSocketEvents,
  ...customerCoordinationEmailSocketEvents,
  ...customerCoordinationSocketEvents,
};
