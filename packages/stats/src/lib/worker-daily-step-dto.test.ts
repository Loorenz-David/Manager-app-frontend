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
    is_time_inaccurate: false,
    wasted: {
      working_seconds: 0,
      pause_seconds: 0,
      ended_shift_seconds: 0,
      completed_count: 0,
    },
    estimated_fill_by_strategy: {
      working: { mean: 0, median: 0, iqr: 0 },
      paused: { mean: 0, median: 0, iqr: 0 },
      ended_shift: { mean: 0, median: 0, iqr: 0 },
    },
    inaccurate_records: [],
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
      stateLabel: "Worked",
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

    expect(card.stateLabel).toBe("Worked");
    expect(card.time).toEqual({ kind: "static", text: "1h 5m" });
  });

  it("working intention ticks when an open working record matches", () => {
    const card = toWorkerDailyStepCardViewModel(
      makeStep({
        active_record: { state: "working", entered_at: "2026-07-16T11:00:00Z" },
      }),
      "working",
    );

    expect(card.stateLabel).toBe("Working");
    expect(card.time).toEqual({
      kind: "ticking",
      offsetSeconds: 3900,
      startedAtIso: "2026-07-16T11:00:00Z",
      ratePerSecond: 1,
    });
  });

  it("splits a batch working interval across the displayed steps", () => {
    const steps = [1, 2, 3].map((stepNumber) =>
      makeStep({
        client_id: `tsp_${stepNumber}`,
        active_record: {
          state: "working",
          entered_at: "2026-07-16T11:00:00Z",
        },
      }),
    );

    const cards = steps.map((step) =>
      toWorkerDailyStepCardViewModel(step, "working", steps.length),
    );

    expect(cards.map((card) => card.time)).toEqual(
      steps.map(() => ({
        kind: "ticking",
        offsetSeconds: 3900,
        startedAtIso: "2026-07-16T11:00:00Z",
        ratePerSecond: 1 / 3,
      })),
    );
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
      ratePerSecond: 1,
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

  it("adds the per-strategy estimated fill to a flagged step's time", () => {
    const flagged = makeStep({
      is_time_inaccurate: true,
      contribution: {
        working_seconds: 0,
        pause_seconds: 0,
        ended_shift_seconds: 0,
        completed_count: 1,
      },
      estimated_fill_by_strategy: {
        working: { mean: 1800.4, median: 1500, iqr: 1620 },
        paused: { mean: 300, median: 240, iqr: 260 },
        ended_shift: { mean: 0, median: 0, iqr: 0 },
      },
    });

    // Default mode is median.
    const card = toWorkerDailyStepCardViewModel(flagged, "working");
    expect(card.isTimeInaccurate).toBe(true);
    expect(card.time).toEqual({ kind: "static", text: "0h 25m" });
    expect(card.inaccurateBadgeLabel).toBe("Estimated");

    expect(
      toWorkerDailyStepCardViewModel(flagged, "working", 1, "mean").time,
    ).toEqual({ kind: "static", text: "0h 30m" });
    expect(
      toWorkerDailyStepCardViewModel(flagged, "paused", 1, "iqr").time,
    ).toEqual({ kind: "static", text: "0h 4m" });
  });

  it("the off mode shows trusted time only and relabels the badge", () => {
    const flagged = makeStep({
      is_time_inaccurate: true,
      contribution: {
        working_seconds: 60,
        pause_seconds: 0,
        ended_shift_seconds: 0,
        completed_count: 1,
      },
      estimated_fill_by_strategy: {
        working: { mean: 1800, median: 1500, iqr: 1620 },
        paused: { mean: 300, median: 240, iqr: 260 },
        ended_shift: { mean: 0, median: 0, iqr: 0 },
      },
    });

    const off = toWorkerDailyStepCardViewModel(flagged, "working", 1, "none");
    // Trusted 60s only — no fill absorbed.
    expect(off.time).toEqual({ kind: "static", text: "0h 1m" });
    expect(off.isTimeInaccurate).toBe(true);
    // "Estimated" would be a lie when nothing was added.
    expect(off.inaccurateBadgeLabel).toBe("Flagged");

    // Same honesty when a real strategy resolves to a suppressed 0 fill.
    const thin = toWorkerDailyStepCardViewModel(
      makeStep({
        is_time_inaccurate: true,
        estimated_fill_by_strategy: {
          working: { mean: 0, median: 0, iqr: 0 },
          paused: { mean: 0, median: 0, iqr: 0 },
          ended_shift: { mean: 0, median: 0, iqr: 0 },
        },
      }),
      "working",
      1,
      "median",
    );
    expect(thin.inaccurateBadgeLabel).toBe("Flagged");
  });

  it("never adds fills to unflagged steps", () => {
    const card = toWorkerDailyStepCardViewModel(
      makeStep({
        estimated_fill_by_strategy: {
          working: { mean: 1800, median: 1500, iqr: 1620 },
          paused: { mean: 300, median: 240, iqr: 260 },
          ended_shift: { mean: 0, median: 0, iqr: 0 },
        },
      }),
      "working",
    );

    expect(card.isTimeInaccurate).toBe(false);
    expect(card.inaccurateBadgeLabel).toBeNull();
    expect(card.time).toEqual({ kind: "static", text: "1h 5m" });
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
