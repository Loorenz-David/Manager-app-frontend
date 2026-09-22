import { describe, expect, it, vi } from "vitest";
import { TASK_STATE_VARIANT } from "@beyo/tasks";
import { z } from "zod";
import {
  wireStockReportAssignment,
  wireStockReportItem,
} from "./fixtures/stock-report-wire-fixtures";
import {
  StockReportAssignmentSchema,
  StockReportItemSchema,
  toStockReportAssignmentCardData,
  toStockReportItemViewModel,
} from "./stock-report.types";

const wireRow = (overrides: Record<string, unknown> = {}) => ({
  ...wireStockReportItem({
    client_id: "sri_1",
    properties: { wood_type: ["dark", "teak"] },
    quantity_requested: 6,
    quantity_in_queue: 2,
    quantity_in_progress: 3,
    quantity_awaiting: 1,
  }),
  ...overrides,
});

const row = (overrides: Record<string, unknown> = {}) =>
  StockReportItemSchema.parse(wireRow(overrides));

describe("stock-report view-model mapping", () => {
  it("maps the pinned fields straight through and formats ordered tags", () => {
    const mapped = toStockReportItemViewModel(row());
    // in_queue is its own bar segment, not folded into in_progress
    // (owner, 2026-09-22 — supersedes intention §4.3).
    expect(mapped?.card).toMatchObject({
      title: "Dining chair",
      imageUrl: null,
      propertyTags: ["Wood Type: Dark / Teak"],
      quantities: { requested: 6, fulfilled: 1, inProgress: 3, inQueue: 2 },
    });
  });

  it("drops an unknown priority without rejecting the rest of the response", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(toStockReportItemViewModel(row({ priority: "urgent" }))).toBeNull();
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });

  /**
   * Scanner controls the criteria values and the backend normaliser passes
   * unrecognised ones through untouched (wiring guide W-1). One odd value must
   * cost one tag, never the whole list.
   */
  it("keeps the list parse alive when one row carries an odd criterion value", () => {
    const odd = wireRow({
      client_id: "sri_odd",
      properties: {
        wood_group: 7,
        finish: "matte",
        size: ["a", 1],
        legs: [],
        colour: ["oak", "walnut"],
      },
    });
    const parsed = z.array(StockReportItemSchema).safeParse([wireRow(), odd]);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const cards = parsed.data.map((item) => toStockReportItemViewModel(item)?.card);
    expect(cards[0]?.propertyTags).toEqual(["Wood Type: Dark / Teak"]);
    // Only the well-formed criterion renders; the others are skipped silently.
    expect(cards[1]?.propertyTags).toEqual(["Colour: Oak / Walnut"]);
  });

  it("fails loudly when a field the contract pins as required is missing", () => {
    // §6.1: quantities and item_category are never null. A fallback here would
    // hide a backend regression as a zero.
    expect(
      StockReportItemSchema.safeParse(wireRow({ quantity_requested: null })).success,
    ).toBe(false);
    expect(
      StockReportItemSchema.safeParse(wireRow({ item_category: null })).success,
    ).toBe(false);
  });
});

const assignment = (state: string) =>
  StockReportAssignmentSchema.parse(wireStockReportAssignment({ state }));

/**
 * The pill on a stock-need card shows the *assignment's* state, not its task's.
 * The owner asked for the two states with an obvious task-state counterpart to
 * borrow its colour, so the same work cannot read one way here and another on
 * the task page.
 */
describe("assignment state pill", () => {
  it("colours every state the backend can send, none of them neutral", () => {
    // The six states of intention §4.2. Neutral is reserved for the degrade
    // path, so a known state falling through to grey is the bug this catches.
    for (const state of [
      "in_queue",
      "in_progress",
      "awaiting",
      "resolved",
      "failed",
      "resolved_early",
    ]) {
      expect(
        toStockReportAssignmentCardData(assignment(state)).statePill?.variant,
      ).not.toBe("neutral");
    }
  });

  it("borrows the working colour for an assignment under way", () => {
    expect(
      toStockReportAssignmentCardData(assignment("in_progress")).statePill,
    ).toEqual({ label: "In progress", variant: TASK_STATE_VARIANT.working });
  });

  it("calls awaiting what the bar calls it — Fulfilled, not Awaiting", () => {
    expect(
      toStockReportAssignmentCardData(assignment("awaiting")).statePill?.label,
    ).toBe("Fulfilled");
  });

  it("names every known state the way the legend does", () => {
    const expected = {
      in_queue: "In queue",
      in_progress: "In progress",
      awaiting: "Fulfilled",
      resolved: "Resolved",
      resolved_early: "Resolved early",
      failed: "Failed",
    };

    for (const [state, label] of Object.entries(expected)) {
      expect(
        toStockReportAssignmentCardData(assignment(state)).statePill?.label,
      ).toBe(label);
    }
  });

  it("borrows the ready colour for every state that counts as completed", () => {
    // `awaiting` is what the bar counts as fulfilled, so it is completed here
    // too (owner, 2026-09-22).
    for (const state of ["resolved", "resolved_early", "awaiting"]) {
      expect(
        toStockReportAssignmentCardData(assignment(state)).statePill?.variant,
      ).toBe(TASK_STATE_VARIANT.ready);
    }
  });

  it("gives queued work the same amber the bar gives it", () => {
    expect(
      toStockReportAssignmentCardData(assignment("in_queue")).statePill,
    ).toEqual({ label: "In queue", variant: "warning" });
  });

  it("keeps failure distinct from every other state", () => {
    expect(
      toStockReportAssignmentCardData(assignment("failed")).statePill?.variant,
    ).toBe("danger");
  });

  it("degrades an unknown state to a neutral pill rather than blanking", () => {
    expect(
      toStockReportAssignmentCardData(assignment("teleported")).statePill,
    ).toEqual({ label: "teleported", variant: "neutral" });
  });

  it("rejects an assignment whose pinned item or task object is missing", () => {
    // §6.2: `item` and `task` are batch-loaded and always present.
    expect(
      StockReportAssignmentSchema.safeParse({
        ...wireStockReportAssignment(),
        item: null,
      }).success,
    ).toBe(false);
    expect(
      StockReportAssignmentSchema.safeParse({
        ...wireStockReportAssignment(),
        task: undefined,
      }).success,
    ).toBe(false);
  });
});
