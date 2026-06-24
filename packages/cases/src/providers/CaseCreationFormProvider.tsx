import { createContext, useContext, useState } from "react";

import { generateClientId } from "@beyo/lib";
import type { CaseConversationMessageId, CaseId } from "@beyo/lib";
import { toBackendPlainText } from "../lib/message-content-adapter";
import type { CaseMessageContent } from "../message-content";
import type { CaseCreationSurfaceOpeners } from "../surface-ids";
import type {
  CaseTypeSelectedDisplay,
  ParticipantSelectedDisplay,
} from "../types";

type CaseCreationFormContextValue = {
  caseClientId: CaseId;
  messageClientId: CaseConversationMessageId;
  regenerateId: () => void;
  regenerateMessageId: () => void;
  entityTypes?: string[];
  entityClientId?: string;
  selectedCaseType: CaseTypeSelectedDisplay | null;
  setSelectedCaseType: (ct: CaseTypeSelectedDisplay | null) => void;
  selectedParticipants: ParticipantSelectedDisplay[];
  setSelectedParticipants: (participants: ParticipantSelectedDisplay[]) => void;
  participantsTotalCount: number | null;
  setParticipantsTotalCount: (count: number | null) => void;
  surfaceOpeners: CaseCreationSurfaceOpeners;
  composerContent: CaseMessageContent;
  composerPlainText: string;
  setComposerContent: (content: CaseMessageContent, plainText: string) => void;
  onCaseCreated: ((plainText: string | undefined) => void) | undefined;
};

const CaseCreationFormContext =
  createContext<CaseCreationFormContextValue | null>(null);

export function CaseCreationFormProvider({
  children,
  entityTypes,
  entityClientId,
  surfaceOpeners,
  onCaseCreated,
  initialCaseType,
  initialComposerContent,
}: {
  children: React.ReactNode;
  entityTypes?: string[];
  entityClientId?: string;
  surfaceOpeners?: CaseCreationSurfaceOpeners;
  onCaseCreated?: (plainText: string | undefined) => void;
  initialCaseType?: CaseTypeSelectedDisplay;
  initialComposerContent?: CaseMessageContent;
}): React.JSX.Element {
  const [caseClientId, setCaseClientId] = useState<CaseId>(
    () => generateClientId("Case") as CaseId,
  );
  const [messageClientId, setMessageClientId] =
    useState<CaseConversationMessageId>(
      () =>
        generateClientId("CaseConversationMessage") as CaseConversationMessageId,
    );
  const [selectedCaseType, setSelectedCaseType] =
    useState<CaseTypeSelectedDisplay | null>(() => initialCaseType ?? null);
  const [selectedParticipants, setSelectedParticipants] = useState<
    ParticipantSelectedDisplay[]
  >([]);
  const [participantsTotalCount, setParticipantsTotalCount] = useState<
    number | null
  >(null);
  const [composerContent, setComposerContentState] =
    useState<CaseMessageContent>(() => initialComposerContent ?? { parts: [] });
  const [composerPlainText, setComposerPlainText] = useState<string>(() =>
    initialComposerContent ? toBackendPlainText(initialComposerContent) : "",
  );

  function regenerateId(): void {
    setCaseClientId(generateClientId("Case") as CaseId);
  }

  function regenerateMessageId(): void {
    setMessageClientId(
      generateClientId("CaseConversationMessage") as CaseConversationMessageId,
    );
  }

  function setComposerContent(
    content: CaseMessageContent,
    plainText: string,
  ): void {
    setComposerContentState(content);
    setComposerPlainText(plainText);
  }

  return (
    <CaseCreationFormContext.Provider
      value={{
        caseClientId,
        messageClientId,
        regenerateId,
        regenerateMessageId,
        entityTypes,
        entityClientId,
        selectedCaseType,
        setSelectedCaseType,
        selectedParticipants,
        setSelectedParticipants,
        participantsTotalCount,
        setParticipantsTotalCount,
        surfaceOpeners: surfaceOpeners ?? {},
        composerContent,
        composerPlainText,
        setComposerContent,
        onCaseCreated,
      }}
    >
      {children}
    </CaseCreationFormContext.Provider>
  );
}

export function useCaseCreationFormContext(): CaseCreationFormContextValue {
  const ctx = useContext(CaseCreationFormContext);

  if (!ctx) {
    throw new Error(
      "useCaseCreationFormContext must be used inside CaseCreationFormProvider",
    );
  }

  return ctx;
}
