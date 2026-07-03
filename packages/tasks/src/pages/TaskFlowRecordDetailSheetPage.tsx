import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import type { TaskFlowRecordDetailSurfaceProps } from "../surface-ids";

export function TaskFlowRecordDetailSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { flowRecordId } = useSurfaceProps<TaskFlowRecordDetailSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Flow record");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col gap-2 p-6 text-muted-foreground">
      <p className="text-sm">Flow record details coming soon.</p>
      <p className="text-xs text-border">{flowRecordId}</p>
    </div>
  );
}
