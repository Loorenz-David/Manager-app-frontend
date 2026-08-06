import { describe, expect, it } from "vitest";

import { normalizeReturnFormPayload } from "./normalize-task-form-payload";
import { buildReturnFormDefaultValues } from "./return-form-default-values";

const ids = {
  taskClientId: "tsk_1",
  itemClientId: "itm_1",
  customerClientId: "cus_1",
  noteClientId: "note_1",
  currentUserClientId: "usr_1",
};

describe("normalizeReturnFormPayload item inclusion", () => {
  it("omits item entirely when nothing identifying or otherwise was filled in", () => {
    const values = buildReturnFormDefaultValues(false);

    const payload = normalizeReturnFormPayload(values, ids, "return");

    expect(payload).not.toHaveProperty("item");
  });

  it("still sends item {} when forceItemInclusion is set, even with nothing else filled in", () => {
    const values = buildReturnFormDefaultValues(true);

    const payload = normalizeReturnFormPayload(values, ids, "return", {
      forceItemInclusion: true,
    });

    // An omitted item creates nothing at all — the auto-assign path requires
    // item to be sent, even empty, so the backend has something to allocate
    // a sku onto (HANDOFF_TO_FRONTEND_sku_template_gapless_allocation_20260804 §3a).
    expect(payload.item).toEqual({
      client_id: ids.itemClientId,
      article_number: undefined,
      sku: undefined,
      item_category_id: undefined,
      quantity: 1,
      designer: undefined,
      item_position: undefined,
      item_zone: undefined,
      item_currency: undefined,
    });
  });

  it("still includes item when identity was actually typed, forced or not", () => {
    const values = {
      ...buildReturnFormDefaultValues(false),
      item: {
        ...buildReturnFormDefaultValues(false).item,
        article_number: "ABC-123",
      },
    };

    const payload = normalizeReturnFormPayload(values, ids, "return");

    expect(payload.item).toMatchObject({ article_number: "ABC-123" });
  });
});

describe("normalizeReturnFormPayload can_have_upholstery", () => {
  function valuesWith(
    canHaveUpholstery: boolean | undefined,
    upholstery: Partial<{
      upholstery_client_id: string | null;
      upholstery_amount_meters: number | null;
    }> = {},
  ) {
    const defaults = buildReturnFormDefaultValues(false);

    return {
      ...defaults,
      item: {
        ...defaults.item,
        article_number: "ABC-123",
        can_have_upholstery: canHaveUpholstery,
      },
      item_upholstery: {
        ...defaults.item_upholstery,
        ...upholstery,
      },
    };
  }

  it("omits the key entirely when the flag was never recorded", () => {
    const payload = normalizeReturnFormPayload(
      valuesWith(undefined),
      ids,
      "return",
    );

    // Absent, not null — the column is non-nullable and rejects an explicit
    // null (HANDOFF_TO_FRONTEND_item_can_have_upholstery_flag_20260805 §3).
    expect(payload.item).not.toHaveProperty("can_have_upholstery");
  });

  it("sends false and drops the upholstery section when marked as none", () => {
    const payload = normalizeReturnFormPayload(
      valuesWith(false, { upholstery_amount_meters: 4 }),
      ids,
      "return",
    );

    expect(payload.item).toMatchObject({ can_have_upholstery: false });
    expect(payload).not.toHaveProperty("item_upholstery");
  });

  it("sends true alongside a selected upholstery", () => {
    const payload = normalizeReturnFormPayload(
      valuesWith(true, { upholstery_client_id: "uph_a" }),
      ids,
      "return",
    );

    expect(payload.item).toMatchObject({ can_have_upholstery: true });
    expect(payload.item_upholstery).toMatchObject({ upholstery_id: "uph_a" });
  });

  it("carries the item on the flag alone when nothing else was filled in", () => {
    const defaults = buildReturnFormDefaultValues(false);
    const payload = normalizeReturnFormPayload(
      {
        ...defaults,
        item: { ...defaults.item, can_have_upholstery: false },
      },
      ids,
      "return",
    );

    expect(payload.item).toMatchObject({ can_have_upholstery: false });
  });
});
