export const upholsteryKeys = {
  all: ["upholsteries"] as const,
  details: () => [...upholsteryKeys.all, "detail"] as const,
  detail: (id: string) => [...upholsteryKeys.details(), id] as const,
  missing: () => [...upholsteryKeys.all, "missing"] as const,
};
