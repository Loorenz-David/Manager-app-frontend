import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { ReturnFormContent } from "../components/ReturnFormContent";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";
import type { TaskCreationSlideSurfaceProps } from "../surfaces";

export function ReturnTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { callbacks } = useSurfaceProps<TaskCreationSlideSurfaceProps>();

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  return (
    <TaskCreationFormProvider callbacks={callbacks} taskType="return">
      <ReturnFormContent />
    </TaskCreationFormProvider>
  );
}
