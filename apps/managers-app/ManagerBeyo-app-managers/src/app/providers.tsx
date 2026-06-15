import type { ReactNode } from 'react';
import { KeyboardInsetProvider } from '@beyo/ui';
import { useCameraAppLifecycleFlow } from '@beyo/scanner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { Toaster } from 'sonner';
import { BreakpointProvider } from '@/providers/BreakpointProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
    mutations: { retry: 0 },
  },
});

type AppProvidersProps = {
  children: ReactNode;
};

function CameraLifecycleHandler(): null {
  useCameraAppLifecycleFlow();
  return null;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <BreakpointProvider>
          <KeyboardInsetProvider>
            <QueryClientProvider client={queryClient}>
              <CameraLifecycleHandler />
              {children}
              <Toaster position="top-center" richColors />
            </QueryClientProvider>
          </KeyboardInsetProvider>
        </BreakpointProvider>
      </LazyMotion>
    </MotionConfig>
  );
}
