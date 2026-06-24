import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { fetchToggleUpholsteryFavorite } from "../api/fetch-toggle-upholstery-favorite";
import { upholsteryKeys } from "../api/upholstery-keys";
import type { ListUpholsteryPickerParams, UpholsteryPickerOption } from "../types";

type PickerListData = {
  upholsteries: UpholsteryPickerOption[];
  has_more: boolean;
};

type ToggleFavoriteContext = {
  previousLists: Array<[QueryKey, PickerListData | undefined]>;
  previousDetail: UpholsteryPickerOption | undefined;
};

export function useToggleUpholsteryFavorite() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: fetchToggleUpholsteryFavorite,
    onMutate: async ({ client_id, favorite }): Promise<ToggleFavoriteContext> => {
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

        const params = key[key.length - 1] as ListUpholsteryPickerParams | undefined;
        const isFavoriteView = params?.favorite === true;
        let nextUpholsteries = data.upholsteries.map((item) =>
          item.client_id === client_id ? { ...item, favorite } : item,
        );

        if (isFavoriteView && !favorite) {
          nextUpholsteries = nextUpholsteries.filter((item) => item.client_id !== client_id);
        }

        queryClient.setQueryData<PickerListData>(key, {
          ...data,
          upholsteries: nextUpholsteries,
        });
      });

      if (previousDetail) {
        queryClient.setQueryData<UpholsteryPickerOption>(detailKey, {
          ...previousDetail,
          favorite,
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
    toggleFavorite: mutation.mutate,
    toggleFavoriteAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    variables: mutation.variables,
  };
}

export type ToggleUpholsteryFavoriteAction = ReturnType<typeof useToggleUpholsteryFavorite>;
