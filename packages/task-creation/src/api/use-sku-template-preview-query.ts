import { useQuery } from "@tanstack/react-query";

import type { TaskCreationFormType } from "../types";
import { getSkuTemplateByTaskType } from "./get-sku-template-by-task-type";
import { skuTemplateKeys } from "./sku-template-keys";

export function useSkuTemplatePreviewQuery(
  taskType: TaskCreationFormType,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: skuTemplateKeys.byTaskType(taskType),
    queryFn: () => getSkuTemplateByTaskType(taskType),
    enabled: options.enabled ?? true,
    // The preview goes stale the moment anyone else submits a pre-order, and
    // it is only ever ghost text — a short window keeps it honest without
    // making the form chatty. The `sku_template:scalar-reserved` socket event
    // invalidates it as soon as a real allocation happens.
    staleTime: 30_000,
    // A 404 means this workspace has no template for the task type. That is a
    // settled answer, not a transient failure.
    retry: false,
  });
}
