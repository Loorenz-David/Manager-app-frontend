export const itemIssueKeys = {
  all: () => ["item-issues"] as const,
  byItem: (
    itemId: string,
    params?: { working_section_id?: string; item_category_id?: string },
  ) => ["item-issues", "by-item", itemId, params ?? {}] as const,
};
