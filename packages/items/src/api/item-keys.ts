import type { LookupItemsParams } from "../types";

export const itemKeys = {
  all: ["items"] as const,
  lookup: (params: LookupItemsParams) => [...itemKeys.all, "lookup", params] as const,
};
