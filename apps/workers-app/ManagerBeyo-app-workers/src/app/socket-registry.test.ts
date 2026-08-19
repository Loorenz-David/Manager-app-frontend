import { describe, expect, it, vi } from "vitest";

const sourceHandlers = vi.hoisted(() => ({
  itemEconomics: vi.fn(),
  taskStep: vi.fn(),
}));

vi.mock("@beyo/cases", () => ({ caseSocketEvents: {} }));
vi.mock("@beyo/item-economics", () => ({
  itemEconomicsSocketEvents: {
    "task:step-state-changed": sourceHandlers.itemEconomics,
  },
}));
vi.mock("@beyo/notifications", () => ({ notificationSocketEvents: {} }));
vi.mock("@beyo/pause-reasons", () => ({ pauseReasonSocketEvents: {} }));
vi.mock("@beyo/presentations", () => ({ presentationSocketEvents: {} }));
vi.mock("@beyo/task-notes", () => ({ taskNoteSocketEvents: {} }));
vi.mock("@beyo/shopify", () => ({ shopifyProductSyncSocketEvents: {} }));
vi.mock("@beyo/worker-shifts", () => ({ workerShiftSocketEvents: {} }));
vi.mock("@/features/task_steps/socket-events", () => ({
  taskStepSocketEvents: {
    "task:step-state-changed": sourceHandlers.taskStep,
  },
}));
vi.mock("@/features/upholstery/socket-events", () => ({
  upholsterySocketEvents: {},
}));
vi.mock("@/features/working_sections/socket-events", () => ({
  workerWorkingSectionSocketEvents: {},
}));
vi.mock("@beyo/realtime", async () => {
  const { composeSocketHandlers } = await import(
    "../../../../../packages/realtime/src/lib/socket-compose"
  );
  return { composeSocketHandlers };
});

import { socketRegistry } from "./socket-registry";

describe("socketRegistry", () => {
  it("composes both task step-state handlers", () => {
    const handler = socketRegistry["task:step-state-changed"];

    expect(handler).toBeTypeOf("function");
    expect(handler).not.toBe(sourceHandlers.itemEconomics);
    expect(handler).not.toBe(sourceHandlers.taskStep);
  });
});
