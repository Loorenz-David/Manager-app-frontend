import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { PreOrderFormContent } from "../components/PreOrderFormContent";
import { TaskCreationFormInitializationGate } from "../components/TaskCreationFormInitializationGate";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";
import type { TaskCreationSlideSurfaceProps } from "../surfaces";

export function PreOrderTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { callbacks } = useSurfaceProps<TaskCreationSlideSurfaceProps>();

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  return (
    <TaskCreationFormProvider callbacks={callbacks} taskType="pre_order">
      <TaskCreationFormInitializationGate>
        <PreOrderFormContent />
      </TaskCreationFormInitializationGate>
    </TaskCreationFormProvider>
  );
}
