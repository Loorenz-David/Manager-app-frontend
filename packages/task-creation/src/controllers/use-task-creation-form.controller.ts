import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { selectUser, useAuthStore } from "@beyo/auth";
import { generateClientId } from "@beyo/lib";
import { useSocket } from "@beyo/realtime";

import { skuTemplateKeys } from "../api/sku-template-keys";
import { useSkuTemplatePreviewQuery } from "../api/use-sku-template-preview-query";
import type { TaskCreationCallbacks } from "../surfaces";
import type { TaskCreationFormType } from "../types";

// Any task type can end up with a SKU template — it's a per-workspace admin
// setting, not something the frontend should hardcode a list for. Falling
// back to "pre_order" only matters while `taskType` is undefined, since the
// query stays disabled in that case and never actually reads the fallback.
const FALLBACK_TASK_TYPE: TaskCreationFormType = "pre_order";

type UseTaskCreationFormControllerOptions = {
  callbacks?: TaskCreationCallbacks;
  taskType?: TaskCreationFormType;
};

export function useTaskCreationFormController({
  callbacks,
  taskType,
}: UseTaskCreationFormControllerOptions) {
  const user = useAuthStore(selectUser);
  const currentUserClientId = String(user?.id ?? "");
  const queryClient = useQueryClient();
  const socket = useSocket();

  const [taskClientId, setTaskClientId] = useState(() =>
    generateClientId("ExecutionTask"),
  );
  const [itemClientId, setItemClientId] = useState(() =>
    generateClientId("Item"),
  );
  const [customerClientId, setCustomerClientId] = useState(() =>
    generateClientId("Customer"),
  );
  const [noteClientId, setNoteClientId] = useState(() =>
    generateClientId("TaskNote"),
  );

  // Whether this task type has a configured template is discovered from the
  // response, not assumed — the read is non-destructive, so it needs no
  // once-per-mount guard and never blocks the form, unlike the reserve
  // command it replaced, which burned a number whether or not the form was
  // ever submitted.
  const skuTemplateQuery = useSkuTemplatePreviewQuery(
    taskType ?? FALLBACK_TASK_TYPE,
    { enabled: Boolean(taskType) },
  );

  // Someone else's submission just consumed a number for this task type, so
  // the ghost text this form may be showing is now one behind. The event
  // fires as part of the `task:created` batch on every allocation.
  useEffect(() => {
    if (!socket || !taskType) {
      return;
    }

    const handleScalarReserved = () => {
      void queryClient.invalidateQueries({
        queryKey: skuTemplateKeys.byTaskType(taskType),
      });
    };

    socket.on("sku_template:scalar-reserved", handleScalarReserved);

    return () => {
      socket.off("sku_template:scalar-reserved", handleScalarReserved);
    };
  }, [queryClient, socket, taskType]);

  function regenerateIds(): void {
    setTaskClientId(generateClientId("ExecutionTask"));
    setItemClientId(generateClientId("Item"));
    setCustomerClientId(generateClientId("Customer"));
    setNoteClientId(generateClientId("TaskNote"));
  }

  return {
    taskClientId,
    itemClientId,
    customerClientId,
    noteClientId,
    currentUserClientId,
    regenerateIds,
    callbacks: callbacks ?? {},
    /**
     * Provisional only: the number the backend would assign right now. Shown
     * as ghost text and never written into the form value — a value in the SKU
     * field is a manual override to the API.
     */
    skuPreview: skuTemplateQuery.data?.next_sku_preview ?? null,
    // `isLoading`, not `isPending`: a disabled query stays pending forever on
    // the task types that have no template query at all.
    isSkuPreviewLoading: skuTemplateQuery.isLoading,
    /**
     * Whether this workspace has a template that will auto-assign a SKU. False
     * (404, or a task type without one) means the item still needs a manual
     * article number or SKU to be identifiable.
     */
    hasSkuTemplate: skuTemplateQuery.isSuccess,
  };
}

export type TaskCreationFormController = ReturnType<
  typeof useTaskCreationFormController
>;
