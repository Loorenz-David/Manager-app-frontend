import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { InternalFormContent } from "../components/InternalFormContent";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";
import type { TaskCreationSlideSurfaceProps } from "../surfaces";

export function InternalTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { callbacks } = useSurfaceProps<TaskCreationSlideSurfaceProps>();

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  return (
    <TaskCreationFormProvider callbacks={callbacks}>
      <InternalFormContent />
    </TaskCreationFormProvider>
  );
}
