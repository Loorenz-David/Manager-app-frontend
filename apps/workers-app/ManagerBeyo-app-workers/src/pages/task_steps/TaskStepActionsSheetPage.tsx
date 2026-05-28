import { useEffect } from "react";
import { Briefcase } from "lucide-react";
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
      <button
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
        data-testid="task-step-create-case-button"
        type="button"
        onClick={() => {
          // TODO: navigate to create case surface.
        }}
      >
        <Briefcase
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span>Create Case</span>
      </button>
    </div>
  );
}
