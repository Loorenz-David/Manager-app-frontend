import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@beyo/api-client", () => ({
  apiClient: client,
  ApiRequestError: class ApiRequestError extends Error {
    serverCode?: string;
    details: unknown;
    constructor(
      _status: number,
      _code: string,
      message: string,
      options: { serverCode?: string; details?: unknown } = {},
    ) {
      super(message);
      this.serverCode = options.serverCode;
      this.details = options.details;
    }
  },
}));

import {
  createStockAssignment,
  fetchStockReportAssignments,
  fetchStockReportItems,
  previewStockAssignment,
  removeStockAssignment,
  reorderStockReportItem,
  setStockReportPriority,
  stockAssignmentRefusalReasons,
} from "./stock-report-api";

const item = { client_id: "sri-1", item_category: null, priority: "high" };

describe("stock-report API adapters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests exactly one priority bucket, with Unset omitting the query parameter", async () => {
    client.get.mockResolvedValue({ data: { stock_report_items: [item] } });
    await expect(fetchStockReportItems("unset")).resolves.toEqual([item]);
    await expect(fetchStockReportItems("high")).resolves.toEqual([item]);

    expect(client.get.mock.calls[0]?.[0]).toBe("/api/v1/stock-report/items");
    expect(client.get.mock.calls[0]?.[2]).toBeUndefined();
    expect(client.get.mock.calls[1]?.[2]).toEqual({ priority: "high" });
  });

  it("uses the verified priority, reorder, assignment, and delete endpoint bodies", async () => {
    client.patch.mockResolvedValue({ data: { stock_report_item: item } });
    client.post
      .mockResolvedValueOnce({
        data: {
          stock_task_assignments: [
            {
              client_id: "sta-1",
              stock_report_item_id: "sri-1",
              task_id: "tsk-1",
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { deleted_client_ids: ["sta-1"] } });

    await setStockReportPriority("sri-1", null);
    await reorderStockReportItem("sri-1", 2);
    await createStockAssignment({
      stockReportItemId: "sri-1",
      taskId: "tsk-1",
      itemId: "itm-1",
      overridePropertyMismatch: true,
    });
    await removeStockAssignment("sta-1");

    expect(client.patch.mock.calls.map((call) => [call[0], call[2]])).toEqual([
      ["/api/v1/stock-report/items/sri-1/priority", { priority: null }],
      [
        "/api/v1/stock-report/items/sri-1/priority-order",
        { priority_order: 2 },
      ],
    ]);
    expect(client.post.mock.calls.map((call) => [call[0], call[2]])).toEqual([
      [
        "/api/v1/stock-report/assignments",
        {
          entries: [
            {
              stock_report_item_id: "sri-1",
              task_id: "tsk-1",
              item_id: "itm-1",
              override_property_mismatch: true,
            },
          ],
        },
      ],
      ["/api/v1/stock-report/assignments/delete", { client_ids: ["sta-1"] }],
    ]);
  });

  it("requires a category before preview and sends the verified standard-envelope request", async () => {
    await expect(
      previewStockAssignment("sri-1", {
        articleNumber: "ABC",
        properties: {},
        quantity: 1,
      }),
    ).rejects.toThrow("category");
    expect(client.post).not.toHaveBeenCalled();
    client.post.mockResolvedValue({
      data: {
        can_proceed: true,
        override_required: false,
        refusal_reason: null,
        property_failures: [],
        matched_item_client_id: null,
        values_source: "supplied",
        checks: [],
      },
    });

    await expect(
      previewStockAssignment("sri-1", {
        articleNumber: "ABC",
        sku: "ignored",
        itemCategoryId: "cat-1",
        properties: { wood_group: "teak" },
        quantity: 2,
      }),
    ).resolves.toMatchObject({ can_proceed: true });
    expect(client.post.mock.calls[0]?.[0]).toBe(
      "/api/v1/stock-report/items/sri-1/match-preview",
    );
    expect(client.post.mock.calls[0]?.[2]).toEqual({
      task_id: null,
      article_number: "ABC",
      sku: null,
      item_category_id: "cat-1",
      properties: { wood_group: "teak" },
      quantity: 2,
    });
  });

  it("reads the detail assignments endpoint", async () => {
    client.get.mockResolvedValue({ data: { stock_task_assignments: [] } });
    await expect(fetchStockReportAssignments("sri-1")).resolves.toEqual([]);
    expect(client.get.mock.calls[0]?.[0]).toBe(
      "/api/v1/stock-report/items/sri-1/assignments",
    );
  });

  it("parses only the structured non-overridable assignment refusal", async () => {
    const { ApiRequestError } = await import("@beyo/api-client");
    const error = new ApiRequestError(422, "unprocessable", "refused", {
      serverCode: "stock_assignment_refused",
      details: [{ index: 0, reason: "category_mismatch" }],
    });

    expect(stockAssignmentRefusalReasons(error)).toEqual(["category_mismatch"]);
  });
});
