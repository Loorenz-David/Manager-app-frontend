import { lazy, Suspense, type ComponentType, type ReactElement } from "react";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { RouteLoadingFallback } from "@/components/RouteLoadingFallback";

type LazyRouteComponent = ComponentType<Record<string, never>>;

export function lazyRoute(
  importer: () => Promise<{ default: LazyRouteComponent }>,
): ReactElement {
  const Component = lazy(importer);

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Component />
      </Suspense>
    </RouteErrorBoundary>
  );
}
