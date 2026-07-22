import type { PresentationListFilters } from "../types";
import type { ListPresentationUsersParams } from "./list-users";

export const presentationKeys = {
  all: ["app-update-presentations"] as const,
  lists: () => [...presentationKeys.all, "list"] as const,
  list: (filters: PresentationListFilters = {}) => [...presentationKeys.lists(), filters] as const,
  details: () => [...presentationKeys.all, "detail"] as const,
  detail: (id: string) => [...presentationKeys.details(), id] as const,
  previews: () => [...presentationKeys.all, "preview"] as const,
  preview: (id: string) => [...presentationKeys.previews(), id] as const,
};

export const presentationUserKeys = {
  all: ["presentation-builder-users"] as const,
  lists: () => [...presentationUserKeys.all, "list"] as const,
  list: (params: ListPresentationUsersParams = {}) =>
    [...presentationUserKeys.lists(), params] as const,
};
