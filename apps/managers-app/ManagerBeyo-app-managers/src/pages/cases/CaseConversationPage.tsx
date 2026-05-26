import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';

import { PageSkeleton } from '@/components/ui/PageSkeleton';
import type { CaseId } from '@/types/common';

const CaseConversationRouteHydrator = lazy(() =>
  import('@/features/cases/components/CaseConversationRouteHydrator').then((module) => ({
    default: module.CaseConversationRouteHydrator,
  })),
);

export function CaseConversationPage(): React.JSX.Element {
  const params = useParams<{ caseId: string }>();
  const caseClientId = params.caseId as CaseId | undefined;

  if (!caseClientId) {
    return <div className="bg-background p-6 text-sm text-muted-foreground">Case id is missing.</div>;
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <CaseConversationRouteHydrator caseClientId={caseClientId} />
    </Suspense>
  );
}
