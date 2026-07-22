import type { ReactNode } from "react";
import { Toaster } from "sonner";

export type NotificationHostProviderProps = {
  children: ReactNode;
};

/** Repository notification host used by shells that consume `notify`. */
export function NotificationHostProvider({
  children,
}: NotificationHostProviderProps): React.JSX.Element {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors closeButton visibleToasts={4} />
    </>
  );
}
