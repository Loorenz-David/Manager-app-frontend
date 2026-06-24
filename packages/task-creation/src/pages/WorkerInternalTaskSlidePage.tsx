import { useEffect } from "react";

import { useSurfaceHeader } from "@beyo/hooks";

import { WorkerInternalFormContent } from "../components/WorkerInternalFormContent";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";

export function WorkerInternalTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("New internal task");
  }, [header]);

  return (
    <TaskCreationFormProvider>
      <WorkerInternalFormContent />
    </TaskCreationFormProvider>
  );
}
