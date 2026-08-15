import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { skuTemplateKeys } from "../api/sku-template-keys";
import { PreOrderFormContent } from "../components/PreOrderFormContent";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";
import type { TaskCreationSlideSurfaceProps } from "../surfaces";

export function PreOrderTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { callbacks } = useSurfaceProps<TaskCreationSlideSurfaceProps>();
  const queryClient = useQueryClient();
  // See ReturnTaskSlidePage: remounting the provider is the whole reset. It
  // matters more here — `taskClientId` is what the `shopify.preorder.processed`
  // listener matches on, so a reused id would let the previous task's event
  // drive the next form's overlay.
  const [formInstance, setFormInstance] = useState(0);

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  function handleRequestNewForm(): void {
    // The preview has a 30s staleTime, so a remount alone would re-show the
    // number this submission just consumed.
    void queryClient.invalidateQueries({
      queryKey: skuTemplateKeys.byTaskType("pre_order"),
    });
    setFormInstance((current) => current + 1);
  }

  return (
    // No initialization gate: the SKU preview is a non-committal read, so the
    // form opens immediately and fills in the ghost text when it lands.
    <TaskCreationFormProvider
      key={formInstance}
      callbacks={callbacks}
      taskType="pre_order"
    >
      <PreOrderFormContent onRequestNewForm={handleRequestNewForm} />
    </TaskCreationFormProvider>
  );
}
