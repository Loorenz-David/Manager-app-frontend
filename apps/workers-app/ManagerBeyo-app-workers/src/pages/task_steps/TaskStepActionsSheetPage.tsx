import { useEffect } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { TaskStepActionsSheetSurfaceProps } from "@/features/task_steps/surface-ids";

export function TaskStepActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  useSurfaceProps<TaskStepActionsSheetSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Actions");
    header?.setActions(null);
  }, [header]);

  return (
    <div
      className="flex flex-col gap-3 bg-background p-6"
      data-testid="task-step-actions-sheet"
    >
      <span>Comming Soon</span>
    </div>
  );
}
