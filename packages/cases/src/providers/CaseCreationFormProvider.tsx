import { createContext, useContext, useState } from "react";

import { generateClientId } from "@beyo/lib";
import type { CaseId } from "@beyo/lib";
import type { CaseCreationSurfaceOpeners } from "../surface-ids";
import type { CaseTypeSelectedDisplay } from "../types";
import type { CaseMessageContent } from "../message-content";

type CaseCreationFormContextValue = {
  caseClientId: CaseId;
  regenerateId: () => void;
  entityTypes?: string[];
  selectedCaseType: CaseTypeSelectedDisplay | null;
  setSelectedCaseType: (ct: CaseTypeSelectedDisplay | null) => void;
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
  surfaceOpeners,
}: {
  children: React.ReactNode;
  entityTypes?: string[];
  surfaceOpeners?: CaseCreationSurfaceOpeners;
}): React.JSX.Element {
  const [caseClientId, setCaseClientId] = useState<CaseId>(
    () => generateClientId("Case") as CaseId,
  );
  const [selectedCaseType, setSelectedCaseType] =
    useState<CaseTypeSelectedDisplay | null>(null);
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
        selectedCaseType,
        setSelectedCaseType,
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
