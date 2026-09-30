import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NotificationHostProvider } from "@beyo/lib";
import { createQueryClient } from "@/app/query-client";

export function AppProviders({ children }: { children: ReactNode }): React.JSX.Element {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationHostProvider>{children}</NotificationHostProvider>
    </QueryClientProvider>
  );
}
