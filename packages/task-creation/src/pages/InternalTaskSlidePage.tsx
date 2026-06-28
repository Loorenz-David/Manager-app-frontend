import { useEffect } from "react";

import { useSurfaceHeader } from "@beyo/hooks";

import { InternalFormContent } from "../components/InternalFormContent";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";

export function InternalTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  return (
    <TaskCreationFormProvider>
      <InternalFormContent />
    </TaskCreationFormProvider>
  );
}
