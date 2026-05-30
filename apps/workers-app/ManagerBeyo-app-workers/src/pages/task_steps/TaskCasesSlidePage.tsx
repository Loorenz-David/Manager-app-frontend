import { CasesView, CasesViewProvider } from "@beyo/cases";
import { useSurfaceProps } from "@beyo/hooks";
import type { TaskId } from "@beyo/lib";

import type { TaskCasesSlideSurfaceProps } from "@/features/task_steps/surface-ids";

export function TaskCasesSlidePage(): React.JSX.Element {
  const { taskId } = useSurfaceProps<TaskCasesSlideSurfaceProps>();
  const resolvedTaskId = taskId ?? ("" as TaskId);

  return (
    <CasesViewProvider entityClientId={resolvedTaskId} entityType="task">
      <CasesView />
    </CasesViewProvider>
  );
}
