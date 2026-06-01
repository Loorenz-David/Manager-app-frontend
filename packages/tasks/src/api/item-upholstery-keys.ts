export const itemUpholsteryKeys = {
  all: ["item-upholstery"] as const,
  byItem: (itemId: string) =>
    [...itemUpholsteryKeys.all, "by-item", itemId] as const,
  missing: () => [...itemUpholsteryKeys.all, "missing"] as const,
};