import type { ReactNode } from "react";
import { SurfaceProvider as BaseSurfaceProvider } from "@beyo/ui";
import { surfaceRegistry } from "@/app/surface-registry";

export {
  SurfacePropsContext,
  SurfaceHeaderContext,
  useSurfaceStore,
} from "@beyo/ui";
export type { SurfaceType, SurfaceRegistrations } from "@beyo/ui";

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
