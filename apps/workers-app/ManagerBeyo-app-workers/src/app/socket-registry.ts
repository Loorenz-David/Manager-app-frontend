import { caseSocketEvents } from "@beyo/cases";
import { notificationSocketEvents } from "@beyo/notifications";
import type { SocketEventHandlers } from "@beyo/realtime";
import { taskNoteSocketEvents } from "@beyo/task-notes";
import { taskStepSocketEvents } from "@/features/task_steps/socket-events";
import { upholsterySocketEvents } from "@/features/upholstery/socket-events";
import { workerWorkingSectionSocketEvents } from "@/features/working_sections/socket-events";

export const socketRegistry: SocketEventHandlers = {
  ...caseSocketEvents,
  ...taskStepSocketEvents,
  ...taskNoteSocketEvents,
  ...workerWorkingSectionSocketEvents,
  ...upholsterySocketEvents,
  ...notificationSocketEvents,
};
