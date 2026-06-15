import { useEffect } from "react";

import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";

import type { PendingTaskActionsSheetProps } from "../surfaces";

export function PendingTaskActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  useSurfaceProps<PendingTaskActionsSheetProps>();

  useEffect(() => {
    header?.setTitle("Task actions");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex min-h-40 items-center justify-center p-6 text-sm text-muted-foreground">
      Coming soon
    </div>
  );
}
