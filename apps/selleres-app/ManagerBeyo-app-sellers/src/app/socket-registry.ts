import { caseSocketEvents } from "@beyo/cases";
import { itemEconomicsSocketEvents } from "@beyo/item-economics";
import { notificationSocketEvents } from "@beyo/notifications";
import { presentationSocketEvents } from "@beyo/presentations";
import { composeSocketHandlers } from "@beyo/realtime";
import {
  customerCoordinationEmailSocketEvents,
  customerCoordinationSocketEvents,
} from "@beyo/task-customer-coordination";
import { taskNoteSocketEvents } from "@beyo/task-notes";
import { taskSocketEvents } from "@/features/tasks/socket-events";
import { stockReportSocketEvents } from "@beyo/stock-report";

export const socketRegistry = composeSocketHandlers(
  caseSocketEvents,
  itemEconomicsSocketEvents,
  taskSocketEvents,
  taskNoteSocketEvents,
  notificationSocketEvents,
  presentationSocketEvents,
  customerCoordinationEmailSocketEvents,
  customerCoordinationSocketEvents,
  stockReportSocketEvents,
);
