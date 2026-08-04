import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { PreOrderFormContent } from "../components/PreOrderFormContent";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";
import type { TaskCreationSlideSurfaceProps } from "../surfaces";

export function PreOrderTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { callbacks } = useSurfaceProps<TaskCreationSlideSurfaceProps>();

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  return (
    // No initialization gate: the SKU preview is a non-committal read, so the
    // form opens immediately and fills in the ghost text when it lands.
    <TaskCreationFormProvider callbacks={callbacks} taskType="pre_order">
      <PreOrderFormContent />
    </TaskCreationFormProvider>
  );
}
