import { useEffect, useState } from "react";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { useSurfaceStore } from "@/providers/SurfaceProvider";
import { PWA_UPDATE_SURFACE_ID, type PwaUpdateSurfaceProps } from "../surfaces";

export function PwaUpdateSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { onUpdate } = useSurfaceProps<PwaUpdateSurfaceProps>();
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    header?.setTitle("New version available");
    header?.setActions(null);
  }, [header]);

  async function handleUpdate(): Promise<void> {
    if (!onUpdate || isUpdating) {
      return;
    }

    setIsUpdating(true);
    useSurfaceStore.getState().close(PWA_UPDATE_SURFACE_ID);
    await onUpdate();
  }

  function handleLater(): void {
    useSurfaceStore.getState().close(PWA_UPDATE_SURFACE_ID);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-sm leading-6 text-muted-foreground">
        A new deployment is ready. Reload to switch this installed app to the
        latest version.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card transition disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="pwa-update-confirm-button"
          disabled={isUpdating}
          type="button"
          onClick={() => {
            void handleUpdate();
          }}
        >
          {isUpdating ? "Updating..." : "Update now"}
        </button>
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition"
          type="button"
          onClick={handleLater}
        >
          Later
        </button>
      </div>
    </div>
  );
}
