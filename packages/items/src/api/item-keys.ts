import type { LookupItemLocationParams, LookupItemsParams } from "../types";

export const itemKeys = {
  all: ["items"] as const,
  lookup: (params: LookupItemsParams) => [...itemKeys.all, "lookup", params] as const,
  location: (params: LookupItemLocationParams) =>
    [...itemKeys.all, "location", params] as const,
};
