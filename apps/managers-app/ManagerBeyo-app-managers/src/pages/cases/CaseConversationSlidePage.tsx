import { CaseConversationProvider } from '@/features/cases/providers/CaseConversationProvider';
import { CaseConversationSlideView } from '@/features/cases/components/CaseConversationSlideView';
import type { CaseConversationSurfaceProps } from '@/features/cases/surfaces';
import { useSurfaceProps } from '@/hooks/use-surface-props';

export function CaseConversationSlidePage(): React.JSX.Element {
  const { caseClientId } = useSurfaceProps<CaseConversationSurfaceProps>();

  if (!caseClientId) {
    return <div className="bg-background p-6 text-sm text-muted-foreground">Case id is missing.</div>;
  }

  return (
    <CaseConversationProvider caseClientId={caseClientId}>
      <CaseConversationSlideView />
    </CaseConversationProvider>
  );
}
