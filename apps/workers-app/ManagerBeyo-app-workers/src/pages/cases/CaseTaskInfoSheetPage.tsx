import { useEffect } from "react";

import { useSurfaceHeader } from "@beyo/hooks";

export function CaseTaskInfoSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("Task info");
    header?.setActions(null);
  }, [header]);

  return (
    <div
      className="flex flex-col items-center gap-3 px-6 py-10 text-center"
      data-testid="case-task-info-sheet"
    >
      <p className="text-sm font-medium text-foreground">Coming soon</p>
      <p className="text-xs text-muted-foreground">
        Task details will be available here once the feature is ready.
      </p>
    </div>
  );
}