import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import type { TaskEditSurfaceProps } from "../surface-ids";

export function TaskEditSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskEditSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Edit task");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
      <div className="text-center">
        <p className="text-base font-medium">
          Full task edit mode is not implemented yet.
        </p>
        <p className="mt-2 text-xs text-border">{taskId}</p>
      </div>
    </div>
  );
}
