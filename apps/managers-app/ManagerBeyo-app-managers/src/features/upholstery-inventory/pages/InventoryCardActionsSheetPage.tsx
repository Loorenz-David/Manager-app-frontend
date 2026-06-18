import { useEffect } from "react";

import { useSurfaceHeader } from "@/hooks/use-surface-header";

export function InventoryCardActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("Inventory actions");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="p-6 text-sm text-muted-foreground">
      Card actions are coming soon.
    </div>
  );
}
