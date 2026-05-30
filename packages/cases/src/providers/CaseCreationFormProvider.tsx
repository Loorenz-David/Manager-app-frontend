import { createContext, useContext, useState } from "react";

import { generateClientId } from "@beyo/lib";
import type { CaseId } from "@beyo/lib";
import type { CaseCreationSurfaceOpeners } from "../surface-ids";
import type {
  CaseTypeSelectedDisplay,
  ParticipantSelectedDisplay,
} from "../types";
import type { CaseMessageContent } from "../message-content";

type CaseCreationFormContextValue = {
  caseClientId: CaseId;
  regenerateId: () => void;
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
};

const CaseCreationFormContext =
  createContext<CaseCreationFormContextValue | null>(null);

export function CaseCreationFormProvider({
  children,
  entityTypes,
  entityClientId,
  surfaceOpeners,
}: {
  children: React.ReactNode;
  entityTypes?: string[];
  entityClientId?: string;
  surfaceOpeners?: CaseCreationSurfaceOpeners;
}): React.JSX.Element {
  const [caseClientId, setCaseClientId] = useState<CaseId>(
    () => generateClientId("Case") as CaseId,
  );
  const [selectedCaseType, setSelectedCaseType] =
    useState<CaseTypeSelectedDisplay | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<
    ParticipantSelectedDisplay[]
  >([]);
  const [participantsTotalCount, setParticipantsTotalCount] = useState<
    number | null
  >(null);
  const [composerContent, setComposerContentState] =
    useState<CaseMessageContent>(() => ({ parts: [] }));
  const [composerPlainText, setComposerPlainText] = useState<string>("");

  function regenerateId(): void {
    setCaseClientId(generateClientId("Case") as CaseId);
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
        regenerateId,
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
