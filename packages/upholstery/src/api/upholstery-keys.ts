import type { ListUpholsteryPickerParams } from "../types";
import type { FetchExternalUpholsteryOptionsParams } from "./fetch-external-upholstery-options";

export const upholsteryKeys = {
  all: ["upholsteries"] as const,
  pickerLists: () => [...upholsteryKeys.all, "picker", "list"] as const,
  pickerList: (params: ListUpholsteryPickerParams = {}) =>
    [...upholsteryKeys.pickerLists(), params] as const,
  externalSearch: (params: FetchExternalUpholsteryOptionsParams) =>
    [...upholsteryKeys.all, "external", "search", params] as const,
  nevotexSearch: (q: string) =>
    [...upholsteryKeys.all, "nevotex", "search", q] as const,
  details: () => [...upholsteryKeys.all, "detail"] as const,
  detail: (id: string) => [...upholsteryKeys.details(), id] as const,
};
