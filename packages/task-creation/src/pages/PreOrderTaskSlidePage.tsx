import { useEffect } from "react";

import { useSurfaceHeader } from "@beyo/hooks";

import { PreOrderFormContent } from "../components/PreOrderFormContent";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";

export function PreOrderTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("New pre-order");
  }, [header]);

  return (
    <TaskCreationFormProvider>
      <PreOrderFormContent />
    </TaskCreationFormProvider>
  );
}
