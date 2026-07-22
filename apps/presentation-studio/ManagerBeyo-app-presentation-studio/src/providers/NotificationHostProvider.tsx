import type { ReactNode } from "react";
import { Toaster } from "sonner";

export function NotificationHostProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors closeButton visibleToasts={4} />
    </>
  );
}
