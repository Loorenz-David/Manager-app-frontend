import { describe, expect, it } from "vitest";

import {
  describeHistoryRecord,
  flattenHistoryPages,
  formatSignedMeters,
  getHistoryActorLabel,
  getHistoryBadges,
  getHistoryDeltaChips,
  getHistoryDetailsLabel,
  getHistoryDriftBanner,
  getHistoryRecordTitle,
  humanize,
} from "./inventory-history";
import {
  buckets,
  childRecord,
  historyPage,
  historyRecord,
} from "./inventory-history.fixtures";

const MINUS = "−";

function title(overrides: Parameters<typeof childRecord>[0]): string {
  return getHistoryRecordTitle(childRecord(overrides));
}

describe("getHistoryRecordTitle", () => {
  it("covers every known movement type", () => {
    expect(title({ movement_type: "opening_balance", trigger: "migration_baseline" })).toBe(
      "Opening balance (history starts here)",
    );
    expect(title({ movement_type: "inventory_created", trigger: "inventory_created" })).toBe(
      "Inventory created",
    );
    expect(
      title({ movement_type: "need_added", trigger: "task_created", quantity_meters: "3.000" }),
    ).toBe("Needed for task");
    expect(
      title({ movement_type: "need_adjusted", trigger: "task_deleted", quantity_meters: "-3.000" }),
    ).toBe("Task deleted, need released");
    expect(title({ movement_type: "reserved_for_use", trigger: "step_transition" })).toBe(
      "Reserved for production",
    );
    expect(title({ movement_type: "use_finished", trigger: "step_transition" })).toBe(
      "Used in production",
    );
    expect(
      title({
        movement_type: "used_direct",
        trigger: "requirement_completed_single",
        quantity_meters: "2.500",
      }),
    ).toBe("Used directly from stock (2.5 m)");
    expect(title({ movement_type: "use_rolled_back", trigger: "step_transition" })).toBe(
      "Production use rolled back",
    );
    expect(
      title({ movement_type: "order_placed", trigger: "order_created", quantity_meters: "20.000" }),
    ).toBe("Order placed (20 m)");
    expect(
      title({
        movement_type: "order_received",
        trigger: "order_received",
        quantity_meters: "20.000",
      }),
    ).toBe("Order received (20 m)");
    expect(
      title({ movement_type: "surplus_added", trigger: "surplus_applied", quantity_meters: "1.000" }),
    ).toBe("Surplus added (1 m)");
    expect(
      title({ movement_type: "stored_set", trigger: "manual_stored_set", quantity_meters: "12.500" }),
    ).toBe("Stored amount set to 12.5 m");
    expect(title({ movement_type: "allocation_run", trigger: "stock_reallocated" })).toBe(
      "Stock re-allocated",
    );
    expect(
      title({
        movement_type: "requirement_state_changed",
        trigger: "order_received",
        requirement: { client_id: "iur_1", from_state: "ordered", to_state: "available" },
      }),
    ).toBe("Ordered → Available");
  });

  it("refines titles by trigger", () => {
    expect(title({ movement_type: "need_added", trigger: "task_restored" })).toBe(
      "Task restored, need added again",
    );
    expect(title({ movement_type: "need_added", trigger: "item_upholstery_set" })).toBe(
      "Upholstery set on item",
    );
    expect(
      title({ movement_type: "need_added", trigger: "reconstructed", quantity_meters: "4.000" }),
    ).toBe("Need added (4 m)");
    expect(
      title({ movement_type: "need_adjusted", trigger: "upholstery_swapped", quantity_meters: "-1" }),
    ).toBe("Upholstery swapped, need released");
    expect(
      title({
        movement_type: "need_adjusted",
        trigger: "requirement_quantity_changed",
        quantity_meters: "-1.500",
      }),
    ).toBe("Need reduced by 1.5 m");
    expect(
      title({
        movement_type: "need_adjusted",
        trigger: "requirement_quantity_changed",
        quantity_meters: "2.000",
      }),
    ).toBe("Need increased by 2 m");
    expect(
      title({
        movement_type: "order_placed",
        trigger: "manual_add_ordered",
        quantity_meters: "5.000",
      }),
    ).toBe("Ordered amount added manually (5 m)");
    expect(
      title({
        movement_type: "order_received",
        trigger: "manual_confirm_ordered",
        quantity_meters: "5.000",
      }),
    ).toBe("Ordered amount moved to stock (5 m)");
    expect(title({ movement_type: "allocation_run", trigger: "requirements_marked_ordered" })).toBe(
      "Requirements marked as ordered",
    );
    expect(title({ movement_type: "allocation_run", trigger: "something_else" })).toBe(
      "Requirements re-allocated",
    );
  });

  it("falls back to the order amount and the after snapshot", () => {
    expect(
      title({
        movement_type: "order_placed",
        trigger: "reconstructed",
        quantity_meters: null,
        upholstery_order: {
          client_id: "uor_1",
          state: "ordered",
          order_amount_meters: "8.000",
          received_amount_meters: null,
        },
      }),
    ).toBe("Order placed (8 m)");
    expect(
      title({ movement_type: "order_received", trigger: "reconstructed", quantity_meters: null }),
    ).toBe("Order received");
    expect(
      title({
        movement_type: "stored_set",
        trigger: "manual_stored_set",
        quantity_meters: null,
        after: buckets({ stored: "7.000" }),
      }),
    ).toBe("Stored amount set to 7 m");
    expect(
      title({
        movement_type: "requirement_state_changed",
        requirement: { client_id: "iur_1", from_state: null, to_state: "needs_ordering" },
      }),
    ).toBe("→ Needs ordering");
    expect(title({ movement_type: "requirement_state_changed", requirement: null })).toBe(
      "Requirement state changed",
    );
  });

  it("humanises unknown movement types", () => {
    expect(title({ movement_type: "stock_teleported", trigger: "magic" })).toBe(
      "Stock teleported",
    );
    expect(humanize("weird-kebab_case")).toBe("Weird kebab case");
  });
});

describe("getHistoryActorLabel", () => {
  it("uses the username, else System, else Unknown (reconstructed)", () => {
    expect(
      getHistoryActorLabel(
        childRecord({
          created_by: { client_id: "usr_1", username: "anna", profile_picture: null },
        }),
      ),
    ).toBe("anna");
    expect(getHistoryActorLabel(childRecord({ created_by: null }))).toBe("System");
    expect(
      getHistoryActorLabel(childRecord({ created_by: null, is_reconstructed: true })),
    ).toBe("Unknown (reconstructed)");
    expect(
      getHistoryActorLabel(
        childRecord({
          is_reconstructed: true,
          created_by: { client_id: "usr_1", username: "ola", profile_picture: null },
        }),
      ),
    ).toBe("ola");
  });
});

describe("getHistoryDeltaChips", () => {
  it("keeps non-zero buckets only, with signs", () => {
    const chips = getHistoryDeltaChips(
      childRecord({
        movement_type: "reserved_for_use",
        delta: buckets({ stored: "-3.000", in_use: "3.000", in_need: "-3.000" }),
      }),
    );

    expect(chips.map((chip) => chip.label)).toEqual([
      `Stored ${MINUS}3 m`,
      "In use +3 m",
      `Needed ${MINUS}3 m`,
    ]);
    expect(chips.map((chip) => chip.sign)).toEqual(["negative", "positive", "negative"]);
  });

  it("returns nothing without a delta and skips the used breakdown buckets", () => {
    expect(getHistoryDeltaChips(childRecord({ delta: null }))).toEqual([]);
    expect(
      getHistoryDeltaChips(
        childRecord({
          delta: buckets({
            total_used: "2.000",
            total_used_inventory: "2.000",
            ordered: "20.000",
          }),
        }),
      ).map((chip) => chip.label),
    ).toEqual(["Ordered +20 m", "Used total +2 m"]);
  });

  it("shows an opening balance's starting totals unsigned", () => {
    expect(
      getHistoryDeltaChips(
        childRecord({
          movement_type: "opening_balance",
          delta: null,
          after: buckets({ stored: "15.000", ordered: "5.000" }),
        }),
      ).map((chip) => chip.label),
    ).toEqual(["Stored 15 m", "Ordered 5 m"]);
  });

  it("formats signed meters", () => {
    expect(formatSignedMeters("-0.250")).toBe(`${MINUS}0.25 m`);
    expect(formatSignedMeters("1")).toBe("+1 m");
    expect(formatSignedMeters("0")).toBe("0 m");
    expect(formatSignedMeters(null)).toBeNull();
  });
});

describe("getHistoryBadges", () => {
  it("returns reconstructed, clamped (with detail) and chain-break badges", () => {
    const badges = getHistoryBadges(
      childRecord({
        is_reconstructed: true,
        anomaly: "in_need_clamped_at_zero",
        chain_break: true,
      }),
    );

    expect(badges.map((badge) => badge.label)).toEqual([
      "Reconstructed",
      "Clamped",
      "Unrecorded change before this",
    ]);
    expect(badges[1].detail).toMatch(/below 0/);
    expect(getHistoryBadges(childRecord({ anomaly: "odd_thing" }))[0].detail).toBe(
      "Odd thing",
    );
    expect(getHistoryBadges(childRecord())).toEqual([]);
  });
});

describe("describeHistoryRecord", () => {
  it("formats the task, requirement transition, details and note", () => {
    const description = describeHistoryRecord(
      childRecord({
        movement_type: "reserved_for_use",
        trigger: "step_transition",
        task: {
          client_id: "tsk_1",
          task_scalar_id: 12,
          title: "Sofa",
          state: "in_progress",
          is_deleted: true,
        },
        requirement: { client_id: "iur_1", from_state: "available", to_state: "in_use" },
        details: { pool_meters: "12.000", resolved_requirement_ids: ["a", "b"], unresolved_requirement_ids: ["c"] },
        note: "  checked  ",
      }),
    );

    expect(description.task).toEqual({ taskId: "tsk_1", label: "#12 Sofa", isDeleted: true });
    expect(description.requirementLabel).toBe("Available → In use");
    expect(description.detailsLabel).toBe("Pool 12 m · 2 resolved · 1 still waiting");
    expect(description.note).toBe("checked");
    expect(description.timeLabel).not.toBe("Not set");
  });

  it("does not repeat the transition on a state-change row", () => {
    const description = describeHistoryRecord(
      childRecord({
        requirement: { client_id: "iur_1", from_state: "ordered", to_state: "available" },
        task: { client_id: "tsk_1", task_scalar_id: 3, title: null, state: "x", is_deleted: false },
      }),
    );

    expect(description.title).toBe("Ordered → Available");
    expect(description.requirementLabel).toBeNull();
    expect(description.task?.label).toBe("#3");
  });

  it("ignores unknown detail shapes", () => {
    expect(getHistoryDetailsLabel(null)).toBeNull();
    expect(getHistoryDetailsLabel({ foo: 1 })).toBeNull();
  });
});

describe("flattenHistoryPages", () => {
  it("keeps server order and drops duplicate ids", () => {
    const a = historyRecord({ client_id: "a" });
    const b = historyRecord({ client_id: "b" });
    const c = historyRecord({ client_id: "c" });

    expect(
      flattenHistoryPages([
        historyPage({ records: [a, b] }),
        historyPage({ records: [b, c] }),
      ]).map((record) => record.client_id),
    ).toEqual(["a", "b", "c"]);
  });
});

describe("getHistoryDriftBanner", () => {
  const integrity = {
    status: "drift" as const,
    latest_record_id: "uih_1",
    pointer_matches: true,
    expected: buckets({ stored: "20.000" }),
    current: buckets({ stored: "22.000", total_used_surplus: "1.000" }),
    drift: buckets({ stored: "2.000", total_used_surplus: "1.000" }),
  };

  it("lists non-zero drift buckets when drifting", () => {
    const banner = getHistoryDriftBanner(integrity);

    expect(banner?.message).toMatch(/outside the app's recorded actions/);
    expect(banner?.chips.map((chip) => chip.label)).toEqual([
      "Stored +2 m",
      "Used from surplus +1 m",
    ]);
  });

  it("shows nothing for consistent, no_baseline or missing integrity", () => {
    expect(getHistoryDriftBanner({ ...integrity, status: "consistent" })).toBeNull();
    expect(getHistoryDriftBanner({ ...integrity, status: "no_baseline" })).toBeNull();
    expect(getHistoryDriftBanner(null)).toBeNull();
  });
});
