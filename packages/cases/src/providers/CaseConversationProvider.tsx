import { createContext, useContext, useRef, type ReactNode } from "react";

import type { CaseId } from "@beyo/lib";
import { useEntityView } from "@beyo/realtime";

import {
  useCaseConversationController,
  type CaseConversationController,
} from "../controllers/use-case-conversation.controller";
import {
  useCaseConversationMessagesController,
  type CaseConversationMessagesController,
} from "../controllers/use-case-conversation-messages.controller";
import type { CaseConversationSurfaceOpeners } from "../surface-ids";

const CaseConversationContext =
  createContext<CaseConversationController | null>(null);
const CaseConversationMessagesContext =
  createContext<CaseConversationMessagesController | null>(null);

type CaseConversationProviderProps = {
  caseClientId: CaseId;
  surfaceOpeners?: CaseConversationSurfaceOpeners;
  children: ReactNode;
};

export function CaseConversationProvider({
  caseClientId,
  surfaceOpeners,
  children,
}: CaseConversationProviderProps): React.JSX.Element {
  const scrollToBottomRef = useRef<() => void>(() => undefined);
  const controller = useCaseConversationController(caseClientId, {
    scrollToBottom: () => {
      scrollToBottomRef.current();
    },
    surfaceOpeners,
  });

  const conversationClientId =
    controller.caseDetail?.case.conversation_client_id ?? null;
  useEntityView("conversation", conversationClientId);

  const messagesController = useCaseConversationMessagesController({
    caseClientId,
    lastReadMessageSeq: controller.lastReadMessageSeq,
    requestMarkRead: controller.requestMarkRead,
  });
  scrollToBottomRef.current = messagesController.scrollToBottom;

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
    throw new Error(
      "useCaseConversationContext must be used inside CaseConversationProvider",
    );
  }

  return context;
}

export function useCaseConversationMessagesContext(): CaseConversationMessagesController {
  const context = useContext(CaseConversationMessagesContext);

  if (context === null) {
    throw new Error(
      "useCaseConversationMessagesContext must be used inside CaseConversationProvider",
    );
  }

  return context;
}
