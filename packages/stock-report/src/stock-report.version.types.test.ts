import { describe, expect, it } from "vitest";

import {
  wireDraftStockReportSnapshotVersion,
  wireOverdueDraftStockReportSnapshotVersion,
  wireStockReportSnapshotVersion,
  wireStockReportVersionCounters,
  wireStockReportVersionProgress,
} from "./fixtures/stock-report-wire-fixtures";
import {
  StockReportSnapshotVersionRowSchema,
  StockReportSnapshotVersionSchema,
  toStockReportVersionViewModel,
} from "./stock-report.types";
import { formatScheduleLabel, formatVersionDayTitle } from "./lib/version-format";

const NOW = new Date(2026, 8, 26, 12).getTime();

describe("version view model", () => {
  it("reads the bar as completed over target, per group and in total (§6.8)", () => {
    const version = StockReportSnapshotVersionSchema.parse(wireStockReportSnapshotVersion());
    const model = toStockReportVersionViewModel(version, NOW);

    expect(model.isActive).toBe(true);
    expect(model.totalProgress).toMatchObject({ completed: 9, target: 19, itemsCompleted: 1, itemsTotal: 3 });
    expect(model.totalProgress.percent).toBeCloseTo((9 / 19) * 100, 6);
    expect(model.byPriority.high).toMatchObject({ completed: 8, target: 12 });
    expect(model.byPriority.medium.percent).toBeCloseTo((1 / 7) * 100, 6);
    // The bar's five numbers: done is the completed count, the rest are the
    // group's live counters, so in-progress work shows before completion.
    expect(model.byPriority.medium.quantities).toEqual({ requested: 7, fulfilled: 1, inProgress: 0, inQueue: 0, missing: 0 });
  });

  it("counts a fully-missing group as 0 of 0, not as nothing prioritised", () => {
    const allMissing = wireStockReportVersionCounters({ items_total: 1, quantity_requested: 4, quantity_missing: 4, quantity_target: 0 });
    const version = StockReportSnapshotVersionSchema.parse(wireStockReportSnapshotVersion({ progress: wireStockReportVersionProgress({ ...allMissing, by_priority: { high: allMissing, medium: wireStockReportVersionCounters(), low: wireStockReportVersionCounters() } }) }));
    const model = toStockReportVersionViewModel(version, NOW);

    expect(model.byPriority.high.percent).toBe(0);
    expect(model.byPriority.high.quantities.missing).toBe(4);
    expect(model.byPriority.medium.percent).toBeNull();
  });

  it("renders a zero target as 'nothing prioritised', never as a division", () => {
    const version = StockReportSnapshotVersionSchema.parse(wireStockReportSnapshotVersion({ progress: wireStockReportVersionProgress({ ...wireStockReportVersionCounters(), by_priority: { high: wireStockReportVersionCounters(), medium: wireStockReportVersionCounters(), low: wireStockReportVersionCounters() } }) }));
    const model = toStockReportVersionViewModel(version, NOW);

    expect(model.totalProgress.percent).toBeNull();
    expect(model.byPriority.low.percent).toBeNull();
  });

  it("caps an over-fulfilled group at 100 % and labels a closed version by how long it ran", () => {
    const version = StockReportSnapshotVersionSchema.parse(wireStockReportSnapshotVersion({
      state: "closed",
      active_at: new Date(2026, 8, 20, 9).toISOString(),
      closed_at: new Date(2026, 8, 23, 9).toISOString(),
      progress: wireStockReportVersionProgress({ quantity_target: 4, quantity_completed: 6 }),
    }));
    const model = toStockReportVersionViewModel(version, NOW);

    expect(model.isActive).toBe(false);
    expect(model.totalProgress.percent).toBe(100);
    expect(model.ageLabel).toBe("Ran 3 days");
  });

  it("reads state from `state`, never from the dates (v7 §0.1 item 3)", () => {
    const draft = toStockReportVersionViewModel(StockReportSnapshotVersionSchema.parse(wireDraftStockReportSnapshotVersion()), NOW);
    expect(draft).toMatchObject({ isDraft: true, isActive: false, ageLabel: "Draft" });
    expect(draft.active_at).toBeNull();

    // A closed version with `closed_at` still null on the wire would be a
    // backend slip; `state` wins either way.
    const closed = toStockReportVersionViewModel(StockReportSnapshotVersionSchema.parse(wireStockReportSnapshotVersion({ state: "closed", closed_at: null })), NOW);
    expect(closed.isActive).toBe(false);
  });

  it("falls back to the creation day as the title and labels the schedule (OC-7, v7 §5.21)", () => {
    const created = new Date(2026, 6, 7, 9).toISOString();
    const due = new Date(2026, 9, 5, 6).toISOString();
    const untitled = toStockReportVersionViewModel(StockReportSnapshotVersionSchema.parse(wireDraftStockReportSnapshotVersion({ created_at: created, scheduled_activation_at: due })), NOW);
    expect(untitled.displayTitle).toBe(formatVersionDayTitle(created, NOW));
    expect(untitled.scheduleLabel).toBe(`Activates ${formatScheduleLabel(due, NOW)}`);
    expect(untitled.isOverdue).toBe(false);

    const titled = toStockReportVersionViewModel(StockReportSnapshotVersionSchema.parse(wireDraftStockReportSnapshotVersion({ title: "Autumn push", scheduled_activation_at: null })), NOW);
    expect(titled.displayTitle).toBe("Autumn push");
    expect(titled.scheduleLabel).toBeNull();
  });

  it("shows a draft whose schedule has passed as overdue, and never an active one", () => {
    const past = new Date(NOW - 3_600_000).toISOString();
    const overdue = toStockReportVersionViewModel(StockReportSnapshotVersionSchema.parse(wireOverdueDraftStockReportSnapshotVersion({ scheduled_activation_at: past })), NOW);
    expect(overdue.isOverdue).toBe(true);
    expect(overdue.scheduleLabel).toBe(`Overdue · was due ${formatScheduleLabel(past, NOW)}`);

    const active = toStockReportVersionViewModel(StockReportSnapshotVersionSchema.parse(wireStockReportSnapshotVersion({ scheduled_activation_at: past })), NOW);
    expect(active.isOverdue).toBe(false);
    expect(active.scheduleLabel).toBeNull();
  });

  it("parses the command row without progress and refuses a version without `state` (v7 §6.7)", () => {
    const { progress: _p, filtered_snapshot_count: _f, ...commandRow } = wireStockReportSnapshotVersion();
    expect(StockReportSnapshotVersionRowSchema.safeParse(commandRow).success).toBe(true);
    const { state: _s, ...stateless } = wireStockReportSnapshotVersion();
    expect(StockReportSnapshotVersionSchema.safeParse(stateless).success).toBe(false);
    expect(StockReportSnapshotVersionSchema.safeParse(wireStockReportSnapshotVersion({ state: "archived" as never })).success).toBe(false);
  });

  it("fails loudly when the progress object the contract promises is missing", () => {
    const { progress: _progress, ...bare } = wireStockReportSnapshotVersion();
    expect(StockReportSnapshotVersionSchema.safeParse(bare).success).toBe(false);
  });
});
