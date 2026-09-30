import type { ReactNode } from 'react';
import { KeyboardInsetProvider } from '@beyo/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { Toaster } from 'sonner';
import { BreakpointProvider } from '@/providers/BreakpointProvider';
import { createQueryClient } from '@/app/query-client';

const queryClient = createQueryClient();

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <BreakpointProvider>
          <KeyboardInsetProvider>
            <QueryClientProvider client={queryClient}>
              {children}
              <Toaster position="top-center" richColors />
            </QueryClientProvider>
          </KeyboardInsetProvider>
        </BreakpointProvider>
      </LazyMotion>
    </MotionConfig>
  );
}
