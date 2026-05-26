import { createContext, useContext, type ReactNode } from 'react';

import type { CaseId } from '@/types/common';

import {
  useCaseConversationController,
  type CaseConversationController,
} from '../controllers/use-case-conversation.controller';
import {
  useCaseConversationMessagesController,
  type CaseConversationMessagesController,
} from '../controllers/use-case-conversation-messages.controller';

const CaseConversationContext = createContext<CaseConversationController | null>(null);
const CaseConversationMessagesContext = createContext<CaseConversationMessagesController | null>(null);

type CaseConversationProviderProps = {
  caseClientId: CaseId;
  children: ReactNode;
};

export function CaseConversationProvider({
  caseClientId,
  children,
}: CaseConversationProviderProps): React.JSX.Element {
  const controller = useCaseConversationController(caseClientId);
  const messagesController = useCaseConversationMessagesController({
    caseClientId,
    lastReadMessageSeq: controller.lastReadMessageSeq,
    onListScrollTopChange: controller.setBodyScrollTop,
    requestMarkRead: controller.requestMarkRead,
  });

  return (
    <CaseConversationContext.Provider value={controller}>
      <CaseConversationMessagesContext.Provider value={messagesController}>
        {children}
      </CaseConversationMessagesContext.Provider>
    </CaseConversationContext.Provider>
  );
}

export function useCaseConversationContext(): CaseConversationController {
  const context = useContext(CaseConversationContext);

  if (context === null) {
    throw new Error('useCaseConversationContext must be used inside CaseConversationProvider');
  }

  return context;
}

export function useCaseConversationMessagesContext(): CaseConversationMessagesController {
  const context = useContext(CaseConversationMessagesContext);

  if (context === null) {
    throw new Error(
      'useCaseConversationMessagesContext must be used inside CaseConversationProvider',
    );
  }

  return context;
}
