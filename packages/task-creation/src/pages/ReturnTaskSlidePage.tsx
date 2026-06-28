import { useEffect } from "react";

import { useSurfaceHeader } from "@beyo/hooks";

import { ReturnFormContent } from "../components/ReturnFormContent";
import { TaskCreationFormProvider } from "../providers/TaskCreationFormProvider";

export function ReturnTaskSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  return (
    <TaskCreationFormProvider>
      <ReturnFormContent />
    </TaskCreationFormProvider>
  );
}
