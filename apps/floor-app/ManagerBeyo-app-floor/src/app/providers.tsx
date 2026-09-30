import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BreakpointProvider } from "@beyo/hooks";
import { NotificationHostProvider } from "@beyo/lib";
import { KeyboardInsetProvider } from "@beyo/ui";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";

import { createQueryClient } from "@/app/query-client";

export function AppProviders({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [queryClient] = useState(createQueryClient);

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <BreakpointProvider>
          <KeyboardInsetProvider>
            <QueryClientProvider client={queryClient}>
              <NotificationHostProvider>{children}</NotificationHostProvider>
            </QueryClientProvider>
          </KeyboardInsetProvider>
        </BreakpointProvider>
      </LazyMotion>
    </MotionConfig>
  );
}
