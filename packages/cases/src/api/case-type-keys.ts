import type { ListCaseTypesParams } from "../types";

export const caseTypeKeys = {
  all: ["case-types"] as const,
  lists: () => [...caseTypeKeys.all, "list"] as const,
  list: (params: ListCaseTypesParams = {}) =>
    [...caseTypeKeys.lists(), params] as const,
};
