import { describe, expect, it } from "vitest";

import {
  flattenPagesByOffset,
  reconcileSelectedIdsWithRows,
} from "./use-detail-items.controller";
import type { OrderingItemRow } from "../types";

function makeRow(
  itemUpholsteryId: string,
  amountMeters: number,
): OrderingItemRow {
  return {
    task: {
      client_id: `task_${itemUpholsteryId}`,
      task_scalar_id: 1,
      task_type: "return",
      priority: "normal",
      state: "pending",
      title: null,
      summary: null,
      return_source: "after_purchase",
      item_location: null,
      return_method: null,
      fulfillment_method: "delivery",
      additional_details: null,
      ready_by_at: "2026-06-20",
      scheduled_start_at: null,
      scheduled_end_at: null,
      customer_id: null,
      primary_phone_number: null,
      secondary_phone_number: null,
      primary_email: null,
      secondary_email: null,
      address: null,
      created_at: "2026-06-10T00:00:00.000Z",
      updated_at: null,
      closed_at: null,
      is_deleted: false,
      deleted_at: null,
    },
    primary_item: null,
    item_images: [],
    item_upholstery: {
      client_id: itemUpholsteryId,
      amount_meters: amountMeters,
    },
  };
}

describe("use-detail-items controller helpers", () => {
  it("keeps accumulated rows across loaded offsets without duplicating upholstery ids", () => {
    const rows = flattenPagesByOffset(
      [0, 50],
      {
        0: [makeRow("iup_1", 1.5), makeRow("iup_2", 2)],
        50: [makeRow("iup_2", 2), makeRow("iup_3", 3.25)],
      },
    );

    expect(rows.map((row) => row.item_upholstery?.client_id)).toEqual([
      "iup_1",
      "iup_2",
      "iup_3",
    ]);
  });

  it("preserves only selections that still exist after a multi-page refresh", () => {
    const refreshedRows = flattenPagesByOffset(
      [0, 50],
      {
        0: [makeRow("iup_1", 1.5), makeRow("iup_4", 4)],
        50: [makeRow("iup_3", 3.25)],
      },
    );

    const next = reconcileSelectedIdsWithRows(
      new Set(["iup_1", "iup_2", "iup_3"]),
      refreshedRows,
    );

    expect(Array.from(next).sort()).toEqual(["iup_1", "iup_3"]);
  });
});
