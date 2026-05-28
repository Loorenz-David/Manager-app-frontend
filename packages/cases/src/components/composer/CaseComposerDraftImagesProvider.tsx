import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { EntityImagesProvider } from "@beyo/images";
import type { CaseId } from "@beyo/lib";

import { caseKeys } from "../../api/case-keys";

type CaseComposerDraftImagesProviderProps = {
  caseClientId: CaseId | null;
  draftMessageClientId: string;
  children: ReactNode;
};

export function CaseComposerDraftImagesProvider({
  caseClientId,
  draftMessageClientId,
  children,
}: CaseComposerDraftImagesProviderProps): React.JSX.Element {
  const queryClient = useQueryClient();

  return (
    <EntityImagesProvider
      captureFlow="camera-to-editor"
      entityClientId={draftMessageClientId}
      entityType="case_conversation_message"
      onImagesChanged={() => {
        if (!caseClientId) {
          return;
        }

        void queryClient.invalidateQueries({
          queryKey: caseKeys.detail(caseClientId),
        });
        void queryClient.invalidateQueries({
          queryKey: caseKeys.conversationDetailPagesForCase(caseClientId),
        });
      }}
      viewerMode="preview-edit"
    >
      {children}
    </EntityImagesProvider>
  );
}
