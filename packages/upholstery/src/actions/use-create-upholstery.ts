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
      // With reuse_existing the backend may hand back a record the list already
      // contains — replace it in place instead of appending a duplicate card.
      queryClient.setQueriesData<PickerListData>(
        { queryKey: upholsteryKeys.pickerLists() },
        (old) => {
          if (!old) {
            return old;
          }

          const alreadyListed = old.upholsteries.some(
            (entry) => entry.client_id === upholstery.client_id,
          );

          return {
            ...old,
            upholsteries: alreadyListed
              ? old.upholsteries.map((entry) =>
                  entry.client_id === upholstery.client_id ? upholstery : entry,
                )
              : [...old.upholsteries, upholstery],
          };
        },
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
