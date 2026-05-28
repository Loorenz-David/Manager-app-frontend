import { lazy, Suspense, type ComponentType } from 'react';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { RouteErrorBoundary } from '../components/ui/RouteErrorBoundary';

type LazyComponent = ComponentType<Record<string, never>>;

export function lazyRoute(importer: () => Promise<{ default: LazyComponent }>): React.JSX.Element {
  const Component = lazy(importer);

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <Component />
      </Suspense>
    </RouteErrorBoundary>
  );
}
