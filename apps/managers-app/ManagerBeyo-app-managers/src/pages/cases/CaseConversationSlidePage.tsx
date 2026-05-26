import { useEffect } from 'react';

import type { CaseConversationSurfaceProps } from '@/features/cases/surfaces';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

export function CaseConversationSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { caseClientId } = useSurfaceProps<CaseConversationSurfaceProps>();

  useEffect(() => {
    header?.setTitle('Conversation');
    header?.setActions(null);
  }, [header]);

  return (
    <div
      className="flex h-full items-center justify-center bg-background p-6 text-center"
      data-testid="case-conversation-slide-page"
    >
      <div>
        <p className="text-base font-medium text-foreground">Conversation</p>
        {caseClientId ? <p className="mt-2 text-xs text-muted-foreground">{caseClientId}</p> : null}
      </div>
    </div>
  );
}
