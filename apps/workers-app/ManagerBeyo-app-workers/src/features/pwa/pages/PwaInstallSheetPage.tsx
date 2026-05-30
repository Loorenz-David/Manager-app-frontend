import { useEffect, useState } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { useSurfaceStore } from "@/providers/SurfaceProvider";
import {
  PWA_INSTALL_SURFACE_ID,
  type PwaInstallSurfaceProps,
} from "../surfaces";

export function PwaInstallSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { onInstall } = useSurfaceProps<PwaInstallSurfaceProps>();
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    header?.setTitle("Install app");
    header?.setActions(null);
  }, [header]);

  async function handleInstall(): Promise<void> {
    if (!onInstall || isInstalling) {
      return;
    }

    setIsInstalling(true);
    await onInstall();
    setIsInstalling(false);
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID);
  }

  function handleDismiss(): void {
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-sm leading-6 text-muted-foreground">
        Add Worker Beyo to your home screen for a full-screen app experience and
        faster relaunches.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card transition disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="pwa-install-confirm-button"
          disabled={isInstalling}
          type="button"
          onClick={() => {
            void handleInstall();
          }}
        >
          {isInstalling ? "Opening prompt..." : "Add to home screen"}
        </button>
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition"
          type="button"
          onClick={handleDismiss}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
