import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { composeSocketHandlers } from "./socket-compose";
import type {
  SocketEventHandlers,
  SocketHandlerContext,
} from "./socket-registry-types";

const stepPayload = [{ client_id: "step-1", new_state: "working" }];

function createContext(): SocketHandlerContext {
  return {
    queryClient: new QueryClient(),
    notify: vi.fn() as unknown as SocketHandlerContext["notify"],
  };
}

describe("composeSocketHandlers", () => {
  it("runs handlers for a shared event in map order", () => {
    const calls: string[] = [];
    const first: SocketEventHandlers = {
      "task:step-state-changed": () => calls.push("first"),
    };
    const second: SocketEventHandlers = {
      "task:step-state-changed": () => calls.push("second"),
    };

    composeSocketHandlers(first, second)["task:step-state-changed"]?.(
      stepPayload,
      createContext(),
    );

    expect(calls).toEqual(["first", "second"]);
  });

  it("returns a single handler by its original function reference", () => {
    const handler: NonNullable<
      SocketEventHandlers["task:step-state-changed"]
    > = vi.fn();

    const composed = composeSocketHandlers({
      "task:step-state-changed": handler,
    });

    expect(composed["task:step-state-changed"]).toBe(handler);
  });

  it("skips undefined handler values", () => {
    const handler: NonNullable<
      SocketEventHandlers["task:step-state-changed"]
    > = vi.fn();
    const undefinedHandler = {
      "task:step-state-changed": undefined,
    } as unknown as SocketEventHandlers;

    const composed = composeSocketHandlers(undefinedHandler, {
      "task:step-state-changed": handler,
    });

    expect(composed["task:step-state-changed"]).toBe(handler);
  });

  it("passes the same payload and context to every handler", () => {
    const first = vi.fn();
    const second = vi.fn();
    const context = createContext();
    const composed = composeSocketHandlers(
      { "task:step-state-changed": first },
      { "task:step-state-changed": second },
    );

    composed["task:step-state-changed"]?.(stepPayload, context);

    expect(first).toHaveBeenCalledWith(stepPayload, context);
    expect(second).toHaveBeenCalledWith(stepPayload, context);
  });

  it("preserves both item-economics and task-step invalidations for their shared event", () => {
    const context = createContext();
    const invalidateQueries = vi.spyOn(
      context.queryClient,
      "invalidateQueries",
    );
    const itemEconomicsMap: SocketEventHandlers = {
      "task:step-state-changed": (_payload, { queryClient }) => {
        void queryClient.invalidateQueries({
          queryKey: ["item-economics", "tasks"],
          refetchType: "active",
        });
      },
    };
    const taskStepMap: SocketEventHandlers = {
      "task:step-state-changed": (_payload, { queryClient }) => {
        void queryClient.invalidateQueries({
          queryKey: ["task-steps", "section-lists"],
          refetchType: "active",
        });
      },
    };

    composeSocketHandlers(itemEconomicsMap, taskStepMap)[
      "task:step-state-changed"
    ]?.(stepPayload, context);

    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ["item-economics", "tasks"],
      refetchType: "active",
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ["task-steps", "section-lists"],
      refetchType: "active",
    });
  });
});
