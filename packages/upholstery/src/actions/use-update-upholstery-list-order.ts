import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { fetchUpdateUpholsteryListOrder } from "../api/fetch-update-upholstery-list-order";
import { upholsteryKeys } from "../api/upholstery-keys";
import type { UpholsteryPickerOption } from "../types";

type PickerListData = {
  upholsteries: UpholsteryPickerOption[];
  has_more: boolean;
};

type UpdateListOrderContext = {
  previousLists: Array<[QueryKey, PickerListData | undefined]>;
  previousDetail: UpholsteryPickerOption | undefined;
};

export function useUpdateUpholsteryListOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: fetchUpdateUpholsteryListOrder,
    onMutate: async ({ client_id, list_order }): Promise<UpdateListOrderContext> => {
      await queryClient.cancelQueries({ queryKey: upholsteryKeys.pickerLists() });
      await queryClient.cancelQueries({
        queryKey: upholsteryKeys.detail(client_id),
      });

      const previousLists = queryClient.getQueriesData<PickerListData>({
        queryKey: upholsteryKeys.pickerLists(),
      });
      const detailKey = upholsteryKeys.detail(client_id);
      const previousDetail = queryClient.getQueryData<UpholsteryPickerOption>(detailKey);

      previousLists.forEach(([key, data]) => {
        if (!data) {
          return;
        }

        queryClient.setQueryData<PickerListData>(key, {
          ...data,
          upholsteries: data.upholsteries.map((item) =>
            item.client_id === client_id ? { ...item, list_order } : item,
          ),
        });
      });

      if (previousDetail) {
        queryClient.setQueryData<UpholsteryPickerOption>(detailKey, {
          ...previousDetail,
          list_order,
        });
      }

      return { previousLists, previousDetail };
    },
    onError: (_error, variables, context) => {
      if (!context) {
        return;
      }

      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });

      queryClient.setQueryData(
        upholsteryKeys.detail(variables.client_id),
        context.previousDetail,
      );
    },
    onSuccess: (updatedUpholstery) => {
      const previousLists = queryClient.getQueriesData<PickerListData>({
        queryKey: upholsteryKeys.pickerLists(),
      });

      previousLists.forEach(([key, data]) => {
        if (!data) {
          return;
        }

        queryClient.setQueryData<PickerListData>(key, {
          ...data,
          upholsteries: data.upholsteries.map((item) =>
            item.client_id === updatedUpholstery.client_id ? updatedUpholstery : item,
          ),
        });
      });

      queryClient.setQueryData(
        upholsteryKeys.detail(updatedUpholstery.client_id),
        updatedUpholstery,
      );
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
      if (variables) {
        void queryClient.invalidateQueries({
          queryKey: upholsteryKeys.detail(variables.client_id),
        });
      }
    },
  });

  return {
    updateListOrder: mutation.mutate,
    updateListOrderAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    variables: mutation.variables,
  };
}

export type UpdateUpholsteryListOrderAction = ReturnType<typeof useUpdateUpholsteryListOrder>;
