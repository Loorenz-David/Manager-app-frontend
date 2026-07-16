import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { Avatar } from "@beyo/ui";

import { WorkerInsightsSheetContent } from "../components/WorkerInsightsSheetContent";
import type { WorkerStatsInsightsSheetProps } from "../surface-ids";

export function WorkerStatsInsightsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { insights, workerName, profilePicture } =
    useSurfaceProps<WorkerStatsInsightsSheetProps>();

  useEffect(() => {
    // This sheet renders its own header (avatar + name); hide the surface one.
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-4">
        <Avatar
          className="size-10 text-xs bg-light-border shadow-sm border-light-border"
          imageSrc={profilePicture ?? null}
          name={workerName ?? ""}
        />
        <p className="min-w-0 flex-1 truncate text-md font-semibold text-foreground">
          {workerName ?? "Insights"}
        </p>
      </div>

      <WorkerInsightsSheetContent insights={insights ?? []} />
    </div>
  );
}
