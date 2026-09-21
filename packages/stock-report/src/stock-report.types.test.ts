import { describe, expect, it, vi } from "vitest";
import { StockReportItemSchema, toStockReportItemViewModel } from "./stock-report.types";

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
    expect(mapped?.card).toMatchObject({ propertyTags: ["Wood Type: Dark / Teak"], quantities: { requested: 0, fulfilled: 1, inProgress: 5 } });
  });

  it("drops an unknown priority without rejecting the rest of the response", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(toStockReportItemViewModel(row("urgent"))).toBeNull();
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });
});
