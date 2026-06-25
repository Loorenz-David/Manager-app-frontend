import { useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchCreateUpholstery } from "../api/fetch-create-upholstery";
import { upholsteryKeys } from "../api/upholstery-keys";
import type { UpholsteryPickerOption } from "../types";

type PickerListData = {
  upholsteries: UpholsteryPickerOption[];
  has_more: boolean;
};

export function useCreateUpholstery() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: fetchCreateUpholstery,
    onSuccess: (upholstery) => {
      queryClient.setQueriesData<PickerListData>(
        { queryKey: upholsteryKeys.pickerLists() },
        (old) =>
          old
            ? { ...old, upholsteries: [...old.upholsteries, upholstery] }
            : old,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
      void queryClient.invalidateQueries({ queryKey: ["upholstery-categories"] });
      void queryClient.invalidateQueries({ queryKey: ["upholstery-inventories"] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
