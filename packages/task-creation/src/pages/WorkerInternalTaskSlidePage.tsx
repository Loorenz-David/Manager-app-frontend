import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { WorkerInternalFormContent } from "../components/WorkerInternalFormContent";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";
import type { TaskCreationSlideSurfaceProps } from "../surfaces";

export function WorkerInternalTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { callbacks } = useSurfaceProps<TaskCreationSlideSurfaceProps>();

  useEffect(() => {
    header?.setTitle("New internal task");
  }, [header]);

  return (
    <TaskCreationFormProvider callbacks={callbacks} taskType="internal">
      <WorkerInternalFormContent />
    </TaskCreationFormProvider>
  );
}
