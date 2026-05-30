/// <reference path="../virtual-pwa-register-react.d.ts" />

import { useEffect, useRef, type ReactNode } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import type {
  PwaInstallSurfaceProps,
  PwaSurfaceOpeners,
  PwaUpdateSurfaceProps,
} from "../types";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaProviderProps = {
  surfaceOpeners: PwaSurfaceOpeners;
  children: ReactNode;
};

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function PwaProvider({
  surfaceOpeners,
  children,
}: PwaProviderProps): React.JSX.Element {
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const hasShownInstallPromptRef = useRef(false);
  const hasShownUpdatePromptRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const surfaceOpenersRef = useRef(surfaceOpeners);

  surfaceOpenersRef.current = surfaceOpeners;

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedReload() {
      window.location.href = "/";
    },
    onRegisteredSW(
      _swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) {
      registrationRef.current = registration ?? null;
    },
    onRegisterError(error: unknown) {
      if (import.meta.env.DEV) {
        console.error("[PWA] Service worker registration failed.", error);
      }
    },
  });

  useEffect(() => {
    function checkForUpdate(): void {
      void registrationRef.current?.update();
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const intervalId = setInterval(checkForUpdate, 30 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!needRefresh) {
      hasShownUpdatePromptRef.current = false;
      return;
    }

    if (hasShownUpdatePromptRef.current) {
      return;
    }

    hasShownUpdatePromptRef.current = true;

    const props: PwaUpdateSurfaceProps = {
      onUpdate: async () => {
        setNeedRefresh(false);
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        await updateServiceWorker(true);
      },
    };

    surfaceOpenersRef.current.openUpdatePrompt?.(props);
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event): void {
      if (isStandalone() || hasShownInstallPromptRef.current) {
        return;
      }

      const promptEvent = event as BeforeInstallPromptEvent;

      promptEvent.preventDefault();
      installPromptRef.current = promptEvent;
      hasShownInstallPromptRef.current = true;

      const props: PwaInstallSurfaceProps = {
        onInstall: async () => {
          const pendingPrompt = installPromptRef.current;

          if (!pendingPrompt) {
            return;
          }

          await pendingPrompt.prompt();
          await pendingPrompt.userChoice;
          installPromptRef.current = null;
        },
      };

      surfaceOpenersRef.current.openInstallPrompt?.(props);
    }

    function handleAppInstalled(): void {
      installPromptRef.current = null;
      surfaceOpenersRef.current.closeInstallPrompt?.();
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return <>{children}</>;
}
