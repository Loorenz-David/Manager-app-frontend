import { caseSocketEvents } from "@beyo/cases";
import { itemEconomicsSocketEvents } from "@beyo/item-economics";
import { notificationSocketEvents } from "@beyo/notifications";
import { pauseReasonSocketEvents } from "@beyo/pause-reasons";
import { presentationSocketEvents } from "@beyo/presentations";
import { composeSocketHandlers } from "@beyo/realtime";
import { taskNoteSocketEvents } from "@beyo/task-notes";
import { taskStepSocketEvents } from "@/features/task_steps/socket-events";
import { taskSocketEvents } from "@/features/tasks/socket-events";
import { upholsterySocketEvents } from "@/features/upholstery/socket-events";
import { workerWorkingSectionSocketEvents } from "@/features/working_sections/socket-events";
import { shopifyProductSyncSocketEvents } from "@beyo/shopify";
import { workerShiftSocketEvents } from "@beyo/worker-shifts";
import { stockReportSocketEvents } from "@beyo/stock-report";

export const socketRegistry = composeSocketHandlers(
  workerShiftSocketEvents,
  caseSocketEvents,
  itemEconomicsSocketEvents,
  taskSocketEvents,
  taskStepSocketEvents,
  taskNoteSocketEvents,
  workerWorkingSectionSocketEvents,
  upholsterySocketEvents,
  notificationSocketEvents,
  pauseReasonSocketEvents,
  presentationSocketEvents,
  shopifyProductSyncSocketEvents,
  stockReportSocketEvents,
);
