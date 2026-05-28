import type { ReactNode } from "react";

type PwaProviderProps = {
  children: ReactNode;
};

export function PwaProvider({ children }: PwaProviderProps): React.JSX.Element {
  return <>{children}</>;
}
