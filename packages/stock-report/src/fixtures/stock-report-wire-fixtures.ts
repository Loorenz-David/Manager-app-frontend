/**
 * Wire-shaped builders for the unit tests, one per payload the backend pins in
 * `backend_handoff/HANDOFF_TO_FRONTEND_stock_report_api_20260922.md` §6. They
 * hold every required key so a test that wants one field different can
 * override only that field and still satisfy the schema. Nothing here is a
 * component prop — those live in `stock-report-fixtures.ts`.
 */

import type {
  StockReportAssignment,
  StockReportItem,
} from "../stock-report.types";

export function wireStockReportItem(
  overrides: Partial<StockReportItem> = {},
): StockReportItem {
  return {
    client_id: "sri-1",
    item_category: {
      client_id: "cat-1",
      name: "Dining chair",
      major_category: "seat",
      image_url: null,
    },
    properties: { wood_group: ["teak"] },
    quantity_requested: 5,
    quantity_in_queue: 0,
    quantity_in_progress: 0,
    quantity_awaiting: 0,
    priority: "high",
    priority_order: 1,
    ...overrides,
  };
}

export function wireStockReportAssignment(
  overrides: Partial<StockReportAssignment> = {},
): StockReportAssignment {
  return {
    client_id: "sta-1",
    state: "in_queue",
    stock_report_item_id: "sri-1",
    task_id: "tsk-1",
    item_id: "itm-1",
    quantity: 1,
    item: {
      client_id: "itm-1",
      article_number: "0000405",
      sku: null,
      quantity: 1,
      item_category_snapshot: "Dining chair",
      item_major_category_snapshot: "seat",
      item_images: [],
    },
    task: {
      client_id: "tsk-1",
      task_type: "internal",
      priority: "medium",
      state: "pending",
      title: null,
      return_source: null,
      ready_by_at: null,
      return_method: null,
      created_at: "2026-09-22T09:00:00+00:00",
      updated_at: null,
      closed_at: null,
      completed_at: null,
    },
    ...overrides,
  };
}
