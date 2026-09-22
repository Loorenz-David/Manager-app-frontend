import { describe, expect, it, vi } from "vitest";
import { TASK_STATE_VARIANT } from "@beyo/tasks";
import {
  StockReportAssignmentSchema,
  StockReportItemSchema,
  toStockReportAssignmentCardData,
  toStockReportItemViewModel,
} from "./stock-report.types";

const row = (priority: unknown = "high") => StockReportItemSchema.parse({
  client_id: "sri_1",
  item_category: { client_id: "cat_1", name: "chair", image_url: null },
  properties: { wood_type: ["dark", "teak"], ignored: null },
  quantity_requested: null,
  quantity_in_queue: 2,
  quantity_in_progress: 3,
  quantity_awaiting: 1,
  priority,
});

describe("stock-report view-model mapping", () => {
  it("maps nullish display fields and formats ordered tags", () => {
    const mapped = toStockReportItemViewModel(row());
    // in_queue is its own bar segment, not folded into in_progress
    // (owner, 2026-09-22 — supersedes intention §4.3).
    expect(mapped?.card).toMatchObject({
      propertyTags: ["Wood Type: Dark / Teak"],
      quantities: { requested: 0, fulfilled: 1, inProgress: 3, inQueue: 2 },
    });
  });

  it("drops an unknown priority without rejecting the rest of the response", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(toStockReportItemViewModel(row("urgent"))).toBeNull();
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });
});

const assignment = (state: unknown) =>
  StockReportAssignmentSchema.parse({
    client_id: "sta_1",
    state,
    stock_report_item_id: "sri_1",
    task_id: "tsk_1",
    item_id: "itm_1",
    quantity: 1,
    item: {},
    task: {},
  });

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
    ).toEqual({ label: "in progress", variant: TASK_STATE_VARIANT.working });
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
    ).toEqual({ label: "in queue", variant: "warning" });
  });

  it("keeps failure distinct from every other state", () => {
    expect(
      toStockReportAssignmentCardData(assignment("failed")).statePill?.variant,
    ).toBe("danger");
  });

  it("degrades an unknown or absent state to a neutral pill rather than blanking", () => {
    expect(
      toStockReportAssignmentCardData(assignment("teleported")).statePill,
    ).toEqual({ label: "teleported", variant: "neutral" });
    expect(
      toStockReportAssignmentCardData(assignment(null)).statePill,
    ).toEqual({ label: "Unknown", variant: "neutral" });
  });
});
