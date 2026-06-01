export const itemIssueKeys = {
  all: ["item-issues"] as const,
  byItem: (itemId: string) => [...itemIssueKeys.all, "by-item", itemId] as const,
  missing: () => [...itemIssueKeys.all, "missing"] as const,
};
