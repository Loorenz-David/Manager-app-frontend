import { describe, expect, it, vi } from "vitest";

const sourceHandlers = vi.hoisted(() => ({
  itemEconomics: vi.fn(),
  task: vi.fn(),
}));

vi.mock("@beyo/cases", () => ({ caseSocketEvents: {} }));
vi.mock("@beyo/item-economics", () => ({
  itemEconomicsSocketEvents: {
    "task:step-state-changed": sourceHandlers.itemEconomics,
  },
}));
vi.mock("@beyo/notifications", () => ({ notificationSocketEvents: {} }));
vi.mock("@beyo/presentations", () => ({ presentationSocketEvents: {} }));
vi.mock("@beyo/stats", () => ({ workerStatsSocketEvents: {} }));
vi.mock("@beyo/task-notes", () => ({ taskNoteSocketEvents: {} }));
vi.mock("@beyo/working-sections", () => ({
  workingSectionSocketEvents: {},
}));
vi.mock("@/features/items/socket-events", () => ({ itemSocketEvents: {} }));
vi.mock("@/features/tasks/socket-events", () => ({
  taskSocketEvents: {
    "task:step-state-changed": sourceHandlers.task,
  },
}));
vi.mock("@/features/upholstery-inventory/socket-events", () => ({
  upholsterySocketEvents: {},
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
    expect(handler).not.toBe(sourceHandlers.task);
  });
});
