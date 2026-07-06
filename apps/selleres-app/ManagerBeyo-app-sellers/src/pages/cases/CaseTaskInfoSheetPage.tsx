import { useEffect } from "react";

import type { CaseTaskInfoSheetSurfaceProps } from "@beyo/cases";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";

export function CaseTaskInfoSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, renderTaskCard } =
    useSurfaceProps<CaseTaskInfoSheetSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Task info");
    header?.setActions(null);
  }, [header]);

  if (!taskId) {
    return (
      <div
        className="bg-background p-4 text-sm text-muted-foreground"
        data-testid="case-task-info-sheet"
      >
        Task id is missing.
      </div>
    );
  }

  return (
    <div className="bg-background" data-testid="case-task-info-sheet">
      {renderTaskCard ? renderTaskCard(taskId) : null}
    </div>
  );
}
