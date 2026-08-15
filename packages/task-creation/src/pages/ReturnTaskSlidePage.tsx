import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { skuTemplateKeys } from "../api/sku-template-keys";
import { ReturnFormContent } from "../components/ReturnFormContent";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";
import type { TaskCreationSlideSurfaceProps } from "../surfaces";

export function ReturnTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { callbacks } = useSurfaceProps<TaskCreationSlideSurfaceProps>();
  const queryClient = useQueryClient();
  // Remounting the provider is the reset: it clears the form values, the
  // staged step index and status map, the lookup refs, the per-entity image
  // controllers and the submit overlay in one move, and hands the next task
  // freshly generated client ids — which the pre-order socket match depends
  // on, and which no in-place field reset would produce.
  const [formInstance, setFormInstance] = useState(0);

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  function handleRequestNewForm(): void {
    // The preview has a 30s staleTime, so a remount alone would re-show the
    // number this submission just consumed.
    void queryClient.invalidateQueries({
      queryKey: skuTemplateKeys.byTaskType("return"),
    });
    setFormInstance((current) => current + 1);
  }

  return (
    <TaskCreationFormProvider
      key={formInstance}
      callbacks={callbacks}
      taskType="return"
    >
      <ReturnFormContent onRequestNewForm={handleRequestNewForm} />
    </TaskCreationFormProvider>
  );
}
