import { lazy, Suspense } from 'react';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

const StatsRouteEntry = lazy(() =>
  import('@/features/stats/route-entry').then((module) => ({
    default: module.StatsRouteEntry,
  })),
);

export function StatsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StatsRouteEntry />
    </Suspense>
  );
}
