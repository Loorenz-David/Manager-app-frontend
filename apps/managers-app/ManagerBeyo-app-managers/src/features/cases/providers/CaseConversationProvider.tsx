import { createContext, useContext, type ReactNode } from 'react';

import type { CaseId } from '@/types/common';

import {
  useCaseConversationController,
  type CaseConversationController,
} from '../controllers/use-case-conversation.controller';

const CaseConversationContext = createContext<CaseConversationController | null>(null);

type CaseConversationProviderProps = {
  caseClientId: CaseId;
  children: ReactNode;
};

export function CaseConversationProvider({
  caseClientId,
  children,
}: CaseConversationProviderProps): React.JSX.Element {
  const controller = useCaseConversationController(caseClientId);

  return (
    <CaseConversationContext.Provider value={controller}>
      {children}
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
