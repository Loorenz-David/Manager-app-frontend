import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { UpholsteryInventoryId } from "@/types/common";

import { upholsteryInventoryKeys } from "./upholstery-inventory-keys";

const inventoryId = "uin_01" as UpholsteryInventoryId;

describe("upholsteryInventoryKeys.history", () => {
  it("is nested under the detail and details prefixes", () => {
    const history = upholsteryInventoryKeys.history(inventoryId);

    expect(history).toEqual([
      "upholstery-inventories",
      "detail",
      inventoryId,
      "history",
    ]);
    expect(history.slice(0, 3)).toEqual(
      upholsteryInventoryKeys.detail(inventoryId),
    );
    expect(history.slice(0, 2)).toEqual(upholsteryInventoryKeys.details());
  });

  it("is matched by detail(id) and details() query filters", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(upholsteryInventoryKeys.history(inventoryId), {
      pages: [],
      pageParams: [],
    });

    for (const queryKey of [
      upholsteryInventoryKeys.detail(inventoryId),
      upholsteryInventoryKeys.details(),
    ]) {
      expect(
        queryClient
          .getQueryCache()
          .findAll({ queryKey })
          .map((query) => query.queryKey),
      ).toContainEqual(upholsteryInventoryKeys.history(inventoryId));
    }

    expect(
      queryClient
        .getQueryCache()
        .findAll({ queryKey: upholsteryInventoryKeys.lists() }),
    ).toHaveLength(0);
  });
});
