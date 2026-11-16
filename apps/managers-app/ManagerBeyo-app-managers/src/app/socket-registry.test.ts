import { describe, expect, it, vi } from "vitest";

const sourceHandlers = vi.hoisted(() => ({
  itemEconomics: vi.fn(),
  task: vi.fn(),
  itemRequirement: vi.fn(),
  upholsteryRequirement: vi.fn(),
  inventoryOrderUpdated: vi.fn(),
  orderingOrderUpdated: vi.fn(),
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
vi.mock("@/features/items/socket-events", () => ({
  itemSocketEvents: {
    "item:upholstery-requirement-state-changed": sourceHandlers.itemRequirement,
  },
}));
vi.mock("@/features/tasks/socket-events", () => ({
  taskSocketEvents: {
    "task:step-state-changed": sourceHandlers.task,
  },
}));
vi.mock("@/features/upholstery-inventory/socket-events", () => ({
  upholsterySocketEvents: {
    "item:upholstery-requirement-state-changed":
      sourceHandlers.upholsteryRequirement,
    "upholstery:order-updated": sourceHandlers.inventoryOrderUpdated,
  },
}));
vi.mock("@/features/upholstery-ordering/socket-events", () => ({
  upholsteryOrderingSocketEvents: {
    "upholstery:order-updated": sourceHandlers.orderingOrderUpdated,
  },
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

  it("runs both the item and the inventory requirement-state handlers", () => {
    const handler = socketRegistry["item:upholstery-requirement-state-changed"];
    const payload = { client_id: "", new_state: "available" };
    const ctx = {} as Parameters<NonNullable<typeof handler>>[1];

    handler?.(payload, ctx);

    expect(sourceHandlers.itemRequirement).toHaveBeenCalledWith(payload, ctx);
    expect(sourceHandlers.upholsteryRequirement).toHaveBeenCalledWith(
      payload,
      ctx,
    );
  });

  it("runs both the inventory and the ordering order-updated handlers", () => {
    const handler = socketRegistry["upholstery:order-updated"];
    const payload = { client_id: "uor_1", state: "ordered", order_amount_meters: 3 };
    const ctx = {} as Parameters<NonNullable<typeof handler>>[1];

    handler?.(payload, ctx);

    expect(sourceHandlers.inventoryOrderUpdated).toHaveBeenCalledWith(payload, ctx);
    expect(sourceHandlers.orderingOrderUpdated).toHaveBeenCalledWith(payload, ctx);
  });
});
