import type { ListUpholsteryPickerParams } from "../types";

export const upholsteryKeys = {
  all: ["upholsteries"] as const,
  pickerLists: () => [...upholsteryKeys.all, "picker", "list"] as const,
  pickerList: (params: ListUpholsteryPickerParams = {}) =>
    [...upholsteryKeys.pickerLists(), params] as const,
  details: () => [...upholsteryKeys.all, "detail"] as const,
  detail: (id: string) => [...upholsteryKeys.details(), id] as const,
};
