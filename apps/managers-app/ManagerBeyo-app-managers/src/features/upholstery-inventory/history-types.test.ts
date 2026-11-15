import { describe, expect, it } from "vitest";

import { InventoryHistoryPageSchema } from "./history-types";

const zero = {
  stored: "0.000",
  in_use: "0.000",
  in_need: "0.000",
  ordered: "0.000",
  total_used: "0.000",
  total_used_inventory: "0.000",
  total_used_surplus: "0.000",
  total_surplus: "0.000",
};

const wirePage = {
  records: [
    {
      client_id: "uih_2",
      movement_type: "order_received",
      trigger: "order_received",
      created_at: "2026-11-10T09:30:00+01:00",
      is_reconstructed: false,
      created_by: {
        client_id: "usr_1",
        username: "anna",
        profile_picture: null,
      },
      quantity_meters: "20.000",
      before: zero,
      after: { ...zero, stored: "20.000" },
      delta: { ...zero, stored: "20.000", ordered: "-20.000" },
      requirement: null,
      task: null,
      task_resolution: null,
      item: null,
      upholstery_order: {
        client_id: "uor_1",
        state: "received",
        order_amount_meters: "20.000",
        received_amount_meters: "20.000",
      },
      anomaly: null,
      note: null,
      details: {
        pool_meters: "20.000",
        resolved_requirement_ids: ["iur_1"],
        unresolved_requirement_ids: [],
      },
      chain_break: false,
      children: [
        {
          client_id: "uih_3",
          movement_type: "requirement_state_changed",
          trigger: "order_received",
          created_at: "2026-11-10T09:30:00+01:00",
          is_reconstructed: false,
          created_by: null,
          quantity_meters: null,
          before: null,
          after: null,
          delta: null,
          requirement: {
            client_id: "iur_1",
            from_state: "ordered",
            to_state: "available",
          },
          task: {
            client_id: "tsk_1",
            task_scalar_id: 12,
            title: "Sofa",
            state: "in_progress",
            is_deleted: false,
          },
          task_resolution: "inferred",
          item: {
            client_id: "itm_1",
            article_number: null,
            sku: null,
            item_category_snapshot: null,
          },
          upholstery_order: null,
          anomaly: null,
          note: null,
          details: null,
          chain_break: false,
          // Children may carry an empty list or omit the key entirely.
          children: [],
        },
      ],
    },
    {
      client_id: "uih_1",
      movement_type: "some_future_type",
      trigger: "some_future_trigger",
      created_at: "2026-11-01T08:00:00+00:00",
      is_reconstructed: true,
      created_by: null,
      quantity_meters: null,
      before: null,
      after: null,
      delta: null,
      requirement: null,
      task: null,
      task_resolution: null,
      item: null,
      upholstery_order: null,
      anomaly: "in_need_clamped_at_zero",
      note: null,
      details: null,
      chain_break: true,
      // `children` omitted.
    },
  ],
  integrity: {
    status: "drift",
    latest_record_id: "uih_2",
    pointer_matches: true,
    expected: { ...zero, stored: "20.000" },
    current: { ...zero, stored: "22.000" },
    drift: { ...zero, stored: "2.000" },
  },
  pagination: { limit: 20, has_more: true, next_cursor: "abc==" },
};

describe("InventoryHistoryPageSchema", () => {
  it("parses records with nulls, unknown types and nested children", () => {
    const page = InventoryHistoryPageSchema.parse(wirePage);

    expect(page.records).toHaveLength(2);
    expect(page.records[0].children).toHaveLength(1);
    expect(page.records[0].children[0].task?.task_scalar_id).toBe(12);
    expect(page.records[0].children[0].requirement?.to_state).toBe(
      "available",
    );
    // Child `children` is not part of the child type.
    expect("children" in page.records[0].children[0]).toBe(false);
    expect(page.records[1].children).toEqual([]);
    expect(page.records[1].movement_type).toBe("some_future_type");
    expect(page.integrity?.status).toBe("drift");
    expect(page.pagination.next_cursor).toBe("abc==");
  });

  it("accepts a null integrity block on later pages", () => {
    const page = InventoryHistoryPageSchema.parse({
      ...wirePage,
      integrity: null,
    });

    expect(page.integrity).toBeNull();
  });

  it("rejects an unknown integrity status", () => {
    expect(() =>
      InventoryHistoryPageSchema.parse({
        ...wirePage,
        integrity: { ...wirePage.integrity, status: "weird" },
      }),
    ).toThrow();
  });
});
