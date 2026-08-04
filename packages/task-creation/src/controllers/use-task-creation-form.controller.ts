import { useState } from "react";

import { selectUser, useAuthStore } from "@beyo/auth";
import { generateClientId } from "@beyo/lib";

import { useSkuTemplatePreviewQuery } from "../api/use-sku-template-preview-query";
import type { TaskCreationCallbacks } from "../surfaces";
import type { TaskCreationFormType } from "../types";

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

  // Pre-order is the only task type with a configured SKU template today. The
  // read is non-destructive, so it needs no once-per-mount guard and never
  // blocks the form — unlike the reserve command it replaced, which burned a
  // number whether or not the form was ever submitted.
  const skuTemplateQuery = useSkuTemplatePreviewQuery("pre_order", {
    enabled: taskType === "pre_order",
  });

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
