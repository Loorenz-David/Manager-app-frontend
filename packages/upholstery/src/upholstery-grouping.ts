import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import { UPHOLSTERY_INVENTORY_CONDITION } from "./types";

// Decimals are serialized as strings by the backend (same convention as the
// upholstery inventory endpoints). Accept number too and normalize to string.
const nullableMetersValue = z
  .union([z.string(), z.number()])
  .nullable()
  .transform((value) =>
    value === null ? null : typeof value === "number" ? String(value) : value,
  );

export const UpholsteryGroupInventorySchema = z.object({
  client_id: z.string(),
  upholstery_id: z.string(),
  inventory_condition: z.enum(UPHOLSTERY_INVENTORY_CONDITION).nullable(),
  current_stored_amount_meters: nullableMetersValue,
  current_amount_in_use_meters: nullableMetersValue,
  current_amount_in_need_meters: nullableMetersValue,
  current_amount_ordered_meters: nullableMetersValue,
});
export type UpholsteryGroupInventory = z.infer<
  typeof UpholsteryGroupInventorySchema
>;

// The four additive fields the grouping-enabled list endpoints return on every
// row. All are `null` when `group_by_upholstery` was not sent, so they are
// optional/nullable/defaulted and safe to `.extend()` onto any row schema.
export const UpholsteryGroupFieldsSchema = z.object({
  upholstery_group_key: z.string().nullable().optional().default(null),
  upholstery_group_image_url: z.string().nullable().optional().default(null),
  upholstery_group_upholstery_id: z
    .string()
    .nullable()
    .optional()
    .default(null),
  upholstery_group_inventory: UpholsteryGroupInventorySchema.nullable()
    .optional()
    .default(null),
});
export type UpholsteryGroupFields = z.infer<typeof UpholsteryGroupFieldsSchema>;

export const NO_UPHOLSTERY_LABEL = "Upholstery not selected";

export type UpholsteryGroupHeaderViewModel = {
  reactKey: string;
  label: string;
  imageUrl: string | null;
  upholsteryId: string | null;
  inventory: UpholsteryGroupInventory | null;
};

export type UpholsteryGroupSection<T> = {
  header: UpholsteryGroupHeaderViewModel;
  rows: T[];
  // Sum of `getItemCount` across the section's rows (e.g. total item quantity).
  itemCount: number;
};

export type UpholsteryGroupedRow<T> =
  | {
      kind: "header";
      header: UpholsteryGroupHeaderViewModel;
      itemCount: number;
      isFolded: boolean;
    }
  | { kind: "row"; row: T };

function toHeaderViewModel(
  group: UpholsteryGroupFields,
): UpholsteryGroupHeaderViewModel {
  const key = group.upholstery_group_key;
  return {
    reactKey:
      group.upholstery_group_upholstery_id ?? key ?? "__no_upholstery__",
    label: key ?? NO_UPHOLSTERY_LABEL,
    imageUrl: group.upholstery_group_image_url,
    upholsteryId: group.upholstery_group_upholstery_id,
    inventory: group.upholstery_group_inventory,
  };
}

/**
 * Partitions a flat, already-ordered list into contiguous upholstery sections,
 * summing `getItemCount` per section. The server guarantees same-key rows are
 * contiguous and that the `null` ("no upholstery") bucket sorts last, so a
 * single pass is correct — including across pagination boundaries, provided the
 * caller passes the fully concatenated list. Pure and side-effect free.
 */
export function partitionUpholsteryGroups<T>(
  rows: T[],
  getGroup: (row: T) => UpholsteryGroupFields,
  getItemCount: (row: T) => number,
): UpholsteryGroupSection<T>[] {
  const sections: UpholsteryGroupSection<T>[] = [];
  // `undefined` sentinel means "before the first row" so the first section
  // always opens, even when the first key is `null`.
  let currentKey: string | null | undefined = undefined;
  let current: UpholsteryGroupSection<T> | null = null;

  for (const row of rows) {
    const group = getGroup(row);
    if (current === null || group.upholstery_group_key !== currentKey) {
      currentKey = group.upholstery_group_key;
      current = { header: toHeaderViewModel(group), rows: [], itemCount: 0 };
      sections.push(current);
    }
    current.rows.push(row);
    current.itemCount += getItemCount(row);
  }

  return sections;
}

function flattenSections<T>(
  sections: UpholsteryGroupSection<T>[],
  isSectionFolded: (reactKey: string) => boolean,
): UpholsteryGroupedRow<T>[] {
  const result: UpholsteryGroupedRow<T>[] = [];
  for (const section of sections) {
    const isFolded = isSectionFolded(section.header.reactKey);
    result.push({
      kind: "header",
      header: section.header,
      itemCount: section.itemCount,
      isFolded,
    });
    if (!isFolded) {
      for (const row of section.rows) {
        result.push({ kind: "row", row });
      }
    }
  }
  return result;
}

export type UseUpholsteryGroupingParams<T> = {
  rows: T[];
  enabled: boolean;
  // Pass stable references (module-level or `useCallback`) so the memo holds.
  getGroup: (row: T) => UpholsteryGroupFields;
  getItemCount: (row: T) => number;
};

export type UseUpholsteryGroupingResult<T> = {
  renderRows: UpholsteryGroupedRow<T>[];
  toggleFold: (reactKey: string) => void;
};

/**
 * Owns per-group fold state and derives the flat render list. Groups are
 * **folded by default** when grouping is active, so enabling upholstery
 * grouping collapses to a scannable list of fabric headers; the user expands
 * the groups they care about. State is tracked as the set of *expanded*
 * `reactKey`s (empty = all folded), which means new groups arriving via
 * pagination are folded until opened. When `enabled` is false, returns every
 * row ungrouped with no headers. Both list surfaces share this hook.
 */
export function useUpholsteryGrouping<T>({
  rows,
  enabled,
  getGroup,
  getItemCount,
}: UseUpholsteryGroupingParams<T>): UseUpholsteryGroupingResult<T> {
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const toggleFold = useCallback((reactKey: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(reactKey)) {
        next.delete(reactKey);
      } else {
        next.add(reactKey);
      }
      return next;
    });
  }, []);

  const renderRows = useMemo<UpholsteryGroupedRow<T>[]>(() => {
    if (!enabled) {
      return rows.map((row) => ({ kind: "row", row }));
    }
    const sections = partitionUpholsteryGroups(rows, getGroup, getItemCount);
    return flattenSections(
      sections,
      (reactKey) => !expandedKeys.has(reactKey),
    );
  }, [enabled, expandedKeys, getGroup, getItemCount, rows]);

  return { renderRows, toggleFold };
}
