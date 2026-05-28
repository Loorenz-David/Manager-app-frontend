import type { ReactNode } from "react";
import { SurfaceProvider as BaseSurfaceProvider } from "@beyo/ui";
import { surfaceRegistry } from "@/app/surface-registry";

export type { SurfaceType } from "@beyo/ui";

type SurfaceProviderProps = {
  children: ReactNode;
};

export function SurfaceProvider({
  children,
}: SurfaceProviderProps): React.JSX.Element {
  return (
    <BaseSurfaceProvider registry={surfaceRegistry}>
      {children}
    </BaseSurfaceProvider>
  );
}
