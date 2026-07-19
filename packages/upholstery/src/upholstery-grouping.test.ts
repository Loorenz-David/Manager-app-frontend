import { describe, expect, it } from "vitest";

import {
  NO_UPHOLSTERY_LABEL,
  UpholsteryGroupFieldsSchema,
  partitionUpholsteryGroups,
  type UpholsteryGroupFields,
} from "./upholstery-grouping";

type Row = { id: string; quantity: number } & UpholsteryGroupFields;

function row(
  id: string,
  quantity: number,
  group: Partial<UpholsteryGroupFields>,
): Row {
  return {
    id,
    quantity,
    upholstery_group_key: group.upholstery_group_key ?? null,
    upholstery_group_image_url: group.upholstery_group_image_url ?? null,
    upholstery_group_upholstery_id: group.upholstery_group_upholstery_id ?? null,
    upholstery_group_inventory: group.upholstery_group_inventory ?? null,
  };
}

const getGroup = (r: Row): UpholsteryGroupFields => r;
const getItemCount = (r: Row): number => r.quantity;

describe("UpholsteryGroupFieldsSchema", () => {
  it("defaults all four fields to null when absent", () => {
    const parsed = UpholsteryGroupFieldsSchema.parse({});
    expect(parsed).toEqual({
      upholstery_group_key: null,
      upholstery_group_image_url: null,
      upholstery_group_upholstery_id: null,
      upholstery_group_inventory: null,
    });
  });

  it("normalizes decimal-string inventory meters", () => {
    const parsed = UpholsteryGroupFieldsSchema.parse({
      upholstery_group_key: "Leather Cognac",
      upholstery_group_upholstery_id: "uph_abc",
      upholstery_group_inventory: {
        client_id: "uin_1",
        upholstery_id: "uph_abc",
        inventory_condition: "available",
        current_stored_amount_meters: "42.500",
        current_amount_in_use_meters: 6,
        current_amount_in_need_meters: null,
        current_amount_ordered_meters: "15.000",
      },
    });
    expect(parsed.upholstery_group_inventory?.current_stored_amount_meters).toBe(
      "42.500",
    );
    expect(parsed.upholstery_group_inventory?.current_amount_in_use_meters).toBe(
      "6",
    );
  });
});

describe("partitionUpholsteryGroups", () => {
  it("groups contiguous rows and sums item quantities per section", () => {
    const rows = [
      row("a", 2, {
        upholstery_group_key: "Cognac",
        upholstery_group_upholstery_id: "uph_1",
      }),
      row("b", 3, {
        upholstery_group_key: "Cognac",
        upholstery_group_upholstery_id: "uph_1",
      }),
      row("c", 1, {
        upholstery_group_key: "Denim",
        upholstery_group_upholstery_id: "uph_2",
      }),
    ];

    const sections = partitionUpholsteryGroups(rows, getGroup, getItemCount);

    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      header: { label: "Cognac", reactKey: "uph_1" },
      itemCount: 5,
    });
    expect(sections[0].rows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(sections[1]).toMatchObject({
      header: { label: "Denim", reactKey: "uph_2" },
      itemCount: 1,
    });
  });

  it("renders the null bucket as the 'not selected' section", () => {
    const rows = [
      row("a", 1, {
        upholstery_group_key: "Cognac",
        upholstery_group_upholstery_id: "uph_1",
      }),
      row("b", 4, { upholstery_group_key: null }),
      row("c", 2, { upholstery_group_key: null }),
    ];

    const sections = partitionUpholsteryGroups(rows, getGroup, getItemCount);

    expect(sections).toHaveLength(2);
    expect(sections[1]).toMatchObject({
      header: { label: NO_UPHOLSTERY_LABEL, reactKey: "__no_upholstery__" },
      itemCount: 6,
    });
  });

  it("falls back to the key as reactKey when master id is null", () => {
    const rows = [row("a", 1, { upholstery_group_key: "Custom fabric" })];
    const sections = partitionUpholsteryGroups(rows, getGroup, getItemCount);
    expect(sections[0].header).toMatchObject({
      reactKey: "Custom fabric",
      label: "Custom fabric",
    });
  });

  it("returns an empty list for no rows", () => {
    expect(partitionUpholsteryGroups([], getGroup, getItemCount)).toEqual([]);
  });
});
