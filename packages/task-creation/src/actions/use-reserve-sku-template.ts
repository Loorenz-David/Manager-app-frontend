import { useMutation } from "@tanstack/react-query";

import { ApiRequestError } from "@beyo/api-client";
import { notify } from "@beyo/lib";

import { reserveSkuTemplate } from "../api/reserve-sku-template";

export function useReserveSkuTemplate() {
  const mutation = useMutation({
    mutationFn: reserveSkuTemplate,
    onError: (error) => {
      if (error instanceof ApiRequestError && error.status === 404) {
        notify.error(
          "Automatic SKU unavailable",
          "No SKU template is configured for pre-orders. Enter a SKU manually.",
        );
        return;
      }

      notify.error(
        "Could not reserve an automatic SKU",
        "Enter a SKU manually or reopen the form to try again.",
      );
    },
  });

  return {
    reserveSkuTemplate: mutation.mutate,
    reserveSkuTemplateAsync: mutation.mutateAsync,
    data: mutation.data,
    isIdle: mutation.isIdle,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export type ReserveSkuTemplateAction = ReturnType<
  typeof useReserveSkuTemplate
>;
