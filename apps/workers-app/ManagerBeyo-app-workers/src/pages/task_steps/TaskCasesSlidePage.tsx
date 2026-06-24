import { useEffect } from "react";
import { CasesView, CasesViewProvider } from "@beyo/cases";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { TaskId } from "@beyo/lib";

import type { TaskCasesSlideSurfaceProps } from "@/features/task_steps/surface-ids";

export function TaskCasesSlidePage(): React.JSX.Element {
  const { taskId, articleLabel } = useSurfaceProps<TaskCasesSlideSurfaceProps>();
  const resolvedTaskId = taskId ?? ("" as TaskId);
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle(articleLabel ?? "Cases");
  }, [header, articleLabel]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CasesViewProvider entityClientId={resolvedTaskId} entityType="task">
        <CasesView />
      </CasesViewProvider>
    </div>
  );
}
