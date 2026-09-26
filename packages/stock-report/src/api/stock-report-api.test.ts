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
  createStockReportVersion,
  fetchActiveStockReportVersion,
  fetchStockReportAssignments,
  fetchStockReportItems,
  fetchStockReportMissingSummary,
  fetchStockReportVersions,
  previewStockAssignment,
  removeStockAssignment,
  reorderStockReportItem,
  setStockReportMissingQuantity,
  setStockReportPriority,
  stockAssignmentMismatchFailures,
  stockAssignmentRefusalReasons,
} from "./stock-report-api";

const item = { client_id: "sri-1", item_category: null, snapshot: { priority: "high" } };
const BOARD = { majorCategory: null, missingOnly: false };
const FIRST_PAGE = { limit: 20, offset: 0 };
const itemPage = (items = [item], pagination = { has_more: false, limit: 20, offset: 0 }) => ({
  data: { stock_report_items: items, stock_report_items_pagination: pagination },
});

describe("stock-report API adapters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests exactly one priority bucket, with Unset omitting the query parameter", async () => {
    client.get.mockResolvedValue(itemPage());
    await expect(fetchStockReportItems("unset", BOARD, FIRST_PAGE)).resolves.toEqual({ items: [item], hasMore: false, limit: 20, offset: 0 });
    await expect(fetchStockReportItems("high", BOARD, FIRST_PAGE)).resolves.toEqual({ items: [item], hasMore: false, limit: 20, offset: 0 });

    expect(client.get.mock.calls[0]?.[0]).toBe("/api/v1/stock-report/items");
    // `undefined` entries are dropped by the api-client, so none of the keys is sent.
    expect(client.get.mock.calls[0]?.[2]).toEqual({ priority: undefined, item_major_categories: undefined, missing_only: undefined, limit: 20, offset: 0 });
    expect(client.get.mock.calls[1]?.[2]).toEqual({ priority: "high", item_major_categories: undefined, missing_only: undefined, limit: 20, offset: 0 });
  });

  it("sends the major category as a repeated-key list the backend reads as an enum list", async () => {
    client.get.mockResolvedValue(itemPage());
    await fetchStockReportItems("medium", { majorCategory: "wood", missingOnly: false }, { limit: 50, offset: 100 });

    expect(client.get.mock.calls[0]?.[2]).toEqual({ priority: "medium", item_major_categories: ["wood"], missing_only: undefined, limit: 50, offset: 100 });
  });

  it("asks for every bucket with the backend's own `all` token and the missing filter as a flag", async () => {
    client.get.mockResolvedValue(itemPage([]));
    await fetchStockReportItems("all", { majorCategory: null, missingOnly: true }, FIRST_PAGE);

    // `all` alone — the backend refuses it combined with other priorities.
    expect(client.get.mock.calls[0]?.[2]).toEqual({ priority: "all", item_major_categories: undefined, missing_only: true, limit: 20, offset: 0 });
  });

  it("reads the version endpoints with their verified shapes", async () => {
    client.get
      .mockResolvedValueOnce({ data: { stock_report_snapshot_version: null } })
      .mockResolvedValueOnce({ data: { stock_report_snapshot_versions: [{ client_id: "srv-1" }], stock_report_snapshot_versions_pagination: { has_more: true, limit: 20, offset: 40 } } })
      .mockResolvedValueOnce({ data: { quantity_missing_total: 7, items_with_missing: 3 } });
    client.post.mockResolvedValueOnce({ data: { stock_report_snapshot_version: { client_id: "srv-2" } } });

    // §5.12: no version yet is a 200 with null, not an error.
    await expect(fetchActiveStockReportVersion()).resolves.toBeNull();
    await expect(fetchStockReportVersions({ limit: 20, offset: 40 })).resolves.toEqual({ versions: [{ client_id: "srv-1" }], hasMore: true, limit: 20, offset: 40 });
    await expect(fetchStockReportMissingSummary()).resolves.toEqual({ quantity_missing_total: 7, items_with_missing: 3 });
    await expect(createStockReportVersion()).resolves.toEqual({ client_id: "srv-2" });

    // Both version reads carry the progress filter; omitted, the backend would
    // sum the null-priority snapshots only. Three priorities by default.
    expect(client.get.mock.calls.map((call) => [call[0], call[2]])).toEqual([
      ["/api/v1/stock-report/snapshots/versions/active", { priority: "high,medium,low" }],
      ["/api/v1/stock-report/snapshots/versions", { limit: 20, offset: 40, priority: "high,medium,low" }],
      ["/api/v1/stock-report/snapshots/missing-summary", undefined],
    ]);
    // §5.8: no body at all.
    expect(client.post.mock.calls[0]?.[0]).toBe("/api/v1/stock-report/snapshots/versions");
    expect(client.post.mock.calls[0]?.[2]).toBeUndefined();
  });

  it("sends an explicit progress filter as a comma list, and `all` alone", async () => {
    client.get
      .mockResolvedValueOnce({ data: { stock_report_snapshot_version: null } })
      .mockResolvedValueOnce({ data: { stock_report_snapshot_versions: [], stock_report_snapshot_versions_pagination: { has_more: false, limit: 20, offset: 0 } } });

    await fetchActiveStockReportVersion(["high"]);
    await fetchStockReportVersions({ limit: 20, offset: 0, priorities: "all" });

    expect(client.get.mock.calls[0]?.[2]).toEqual({ priority: "high" });
    expect(client.get.mock.calls[1]?.[2]).toEqual({ limit: 20, offset: 0, priority: "all" });
  });

  it("sends the missing quantity as an absolute strict integer", async () => {
    client.patch.mockResolvedValueOnce({ data: { stock_report_item: item } });
    await expect(setStockReportMissingQuantity("sri-1", 3)).resolves.toEqual(item);
    expect(client.patch.mock.calls[0]?.[0]).toBe("/api/v1/stock-report/items/sri-1/missing-quantity");
    expect(client.patch.mock.calls[0]?.[2]).toEqual({ quantity_missing: 3 });
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

  it("reads the same failure element from a preview and from a 409", async () => {
    const { ApiRequestError } = await import("@beyo/api-client");
    const element = {
      key: "upholstery",
      reason: "value_not_accepted",
      accepted_values: ["foam", "synthetic"],
      item_values: ["down"],
    };
    client.post.mockResolvedValue({
      data: {
        can_proceed: true,
        override_required: true,
        refusal_reason: null,
        property_failures: [element],
        matched_item_client_id: null,
        values_source: "supplied",
        checks: [],
      },
    });

    const preview = await previewStockAssignment("sri-1", {
      articleNumber: "ABC",
      itemCategoryId: "cat-1",
      properties: {},
      quantity: 1,
    });
    const conflict = stockAssignmentMismatchFailures(
      new ApiRequestError(409, "conflict", "mismatch", {
        serverCode: "stock_assignment_property_mismatch",
        details: [{ index: 0, failures: [element] }],
      }),
    );

    expect(preview.property_failures).toEqual([element]);
    expect(conflict).toEqual(preview.property_failures);
  });

  it("does not quietly accept a failure element missing the compared values", async () => {
    const { ApiRequestError } = await import("@beyo/api-client");

    // An element without them cannot fill the Asked/Item columns, so parsing it
    // leniently would put an empty comparison in front of the user instead of
    // telling us the contract moved.
    expect(
      stockAssignmentMismatchFailures(
        new ApiRequestError(409, "conflict", "mismatch", {
          serverCode: "stock_assignment_property_mismatch",
          details: [
            { index: 0, failures: [{ key: "wood_group", reason: "value_not_accepted" }] },
          ],
        }),
      ),
    ).toEqual([]);
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
