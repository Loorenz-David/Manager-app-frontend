import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import type { TaskActionsSurfaceProps } from "../surface-ids";

export function TaskActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskActionsSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Actions");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
      <p className="text-sm">Actions coming soon</p>
      <p className="text-xs text-border">{taskId}</p>
    </div>
  );
}
