import { useEffect, useRef, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import {
  PWA_INSTALL_SURFACE_ID,
  PWA_UPDATE_SURFACE_ID,
  type PwaInstallSurfaceProps,
  type PwaUpdateSurfaceProps,
} from '../surfaces';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PwaProviderProps = {
  children: ReactNode;
};

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

function isStandaloneDisplayMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

export function PwaProvider({ children }: PwaProviderProps): React.JSX.Element {
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const hasShownInstallPromptRef = useRef(false);
  const hasShownUpdatePromptRef = useRef(false);

  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError(error) {
      if (import.meta.env.DEV) {
        console.error('[PWA] Service worker registration failed.', error);
      }
    },
  });

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
        useSurfaceStore.getState().close(PWA_UPDATE_SURFACE_ID);
        await updateServiceWorker(true);
      },
    };

    useSurfaceStore.getState().open(PWA_UPDATE_SURFACE_ID, props);
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event): void {
      if (isStandaloneDisplayMode() || hasShownInstallPromptRef.current) {
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
            useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID);
            return;
          }

          await pendingPrompt.prompt();
          await pendingPrompt.userChoice;
          installPromptRef.current = null;
          useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID);
        },
      };

      useSurfaceStore.getState().open(PWA_INSTALL_SURFACE_ID, props);
    }

    function handleAppInstalled(): void {
      installPromptRef.current = null;
      useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return <>{children}</>;
}
