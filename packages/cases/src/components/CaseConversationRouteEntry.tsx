import type { CaseId } from '@beyo/lib';

import { CaseConversationProvider } from '../providers/CaseConversationProvider';
import { CaseConversationSlideView } from './CaseConversationSlideView';

type CaseConversationRouteEntryProps = {
  caseClientId: CaseId;
};

export function CaseConversationRouteEntry({
  caseClientId,
}: CaseConversationRouteEntryProps): React.JSX.Element {
  return (
    <CaseConversationProvider caseClientId={caseClientId}>
      <CaseConversationSlideView />
    </CaseConversationProvider>
  );
}
