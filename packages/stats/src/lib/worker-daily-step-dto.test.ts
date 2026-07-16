import { describe, expect, it } from "vitest";

import { toWorkerDailyStepCardViewModel } from "./worker-daily-step-dto";
import type { WorkerDailyStep } from "../types";

function makeStep(overrides: Partial<WorkerDailyStep> = {}): WorkerDailyStep {
  return {
    client_id: "tsp_1",
    task_id: "tsk_1",
    state: "working",
    working_section_name_snapshot: "Sanding",
    task: {
      client_id: "tsk_1",
      task_type: "return",
      return_source: "store_return",
      ready_by_at: null,
    },
    item: {
      client_id: "itm_1",
      article_number: "test-1",
      sku: "SKU-9",
      quantity: 2,
    },
    item_images: [
      { client_id: "img_1", image_url: "https://example.com/a.jpg" },
      { client_id: "img_2", image_url: "https://example.com/b.jpg" },
    ],
    contribution: {
      working_seconds: 3900,
      pause_seconds: 8049,
      ended_shift_seconds: 0,
      completed_count: 1,
    },
    active_record: null,
    last_activity_at: "2026-07-16T11:00:00Z",
    last_completed_at: null,
    ...overrides,
  };
}

describe("worker daily-step DTO", () => {
  it("maps identity, image, and type·detail fields", () => {
    const card = toWorkerDailyStepCardViewModel(makeStep(), "working");

    expect(card).toMatchObject({
      stepId: "tsp_1",
      taskId: "tsk_1",
      itemId: "itm_1",
      intention: "working",
      imageUrl: "https://example.com/a.jpg",
      articleLabel: "#test-1",
      quantityLabel: "#2",
      detailLabel: "Store return",
      stateLabel: "Working",
      stateVariant: "active",
    });
    expect(card.images).toHaveLength(2);
    expect(card.images[0]).toMatchObject({
      clientId: "img_1",
      entityType: "item",
      entityClientId: "itm_1",
      isFullyLoaded: true,
    });
  });

  it("working intention shows settled time when no matching open record", () => {
    const card = toWorkerDailyStepCardViewModel(makeStep(), "working");

    expect(card.time).toEqual({ kind: "static", text: "1h 5m" });
  });

  it("working intention ticks when an open working record matches", () => {
    const card = toWorkerDailyStepCardViewModel(
      makeStep({
        active_record: { state: "working", entered_at: "2026-07-16T11:00:00Z" },
      }),
      "working",
    );

    expect(card.time).toEqual({
      kind: "ticking",
      offsetSeconds: 3900,
      startedAtIso: "2026-07-16T11:00:00Z",
    });
  });

  it("does not tick when the open record's state differs from the intention", () => {
    const card = toWorkerDailyStepCardViewModel(
      makeStep({
        active_record: { state: "paused", entered_at: "2026-07-16T11:00:00Z" },
      }),
      "working",
    );

    expect(card.time.kind).toBe("static");
  });

  it("paused intention uses the pause metric and pill", () => {
    const card = toWorkerDailyStepCardViewModel(
      makeStep({
        active_record: { state: "paused", entered_at: "2026-07-16T11:00:00Z" },
      }),
      "paused",
    );

    expect(card.stateLabel).toBe("Paused");
    expect(card.stateVariant).toBe("warning");
    expect(card.time).toEqual({
      kind: "ticking",
      offsetSeconds: 8049,
      startedAtIso: "2026-07-16T11:00:00Z",
    });
  });

  it("completed intention renders the completion HH:mm and never ticks", () => {
    const card = toWorkerDailyStepCardViewModel(
      makeStep({
        state: "completed",
        active_record: null,
        last_completed_at: "2026-07-16T14:22:00",
      }),
      "completed",
    );

    expect(card.stateLabel).toBe("Completed");
    expect(card.stateVariant).toBe("success");
    expect(card.time).toEqual({ kind: "static", text: "14:22" });
  });

  it("falls back gracefully when task, item, and images are absent", () => {
    const card = toWorkerDailyStepCardViewModel(
      makeStep({ task: null, item: null, item_images: [] }),
      "working",
    );

    expect(card).toMatchObject({
      itemId: null,
      imageUrl: null,
      quantityLabel: null,
      articleLabel: "No item linked",
      typeLabel: "—",
      taskType: null,
      // With no return_source, detail falls back to the working section name.
      detailLabel: "Sanding",
    });
    expect(card.images).toHaveLength(0);
  });
});
