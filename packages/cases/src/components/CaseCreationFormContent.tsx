import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
import { generateClientId } from "@beyo/lib";
import type { CaseId } from "@beyo/lib";

import { useCreateCase } from "../actions/use-create-case";
import { caseTypeKeys } from "../api/case-type-keys";
import { listCaseTypes } from "../api/list-case-types";
import {
  hasMeaningfulCaseMessageContent,
  trimCaseMessageContent,
} from "../lib/case-lexical-serialization";
import {
  toBackendMessageContent,
  toBackendPlainText,
} from "../lib/message-content-adapter";
import { useCaseCreationFormContext } from "../providers/CaseCreationFormProvider";
import { CaseCreationFormSchema, type CaseCreationFormValues } from "../types";
import { CaseInitialMessageComposer } from "./CaseInitialMessageComposer";
import { CaseTypePickerTriggerField } from "./CaseTypePickerTriggerField";

export function CaseCreationFormContent(): React.JSX.Element {
  const queryClient = useQueryClient();
  const {
    caseClientId,
    regenerateId,
    entityTypes,
    setSelectedCaseType,
    composerContent,
    setComposerContent,
  } = useCaseCreationFormContext();
  const { createCaseAsync, isPending } = useCreateCase();

  useEffect(() => {
    const params = { entity_type: entityTypes?.join(","), limit: 50 };

    void queryClient.prefetchQuery({
      queryKey: caseTypeKeys.list(params),
      queryFn: () => listCaseTypes(params),
    });
  }, [queryClient, entityTypes]);

  const form = useForm<CaseCreationFormValues>({
    resolver: zodResolver(CaseCreationFormSchema),
    defaultValues: {
      case_type_id: undefined,
      type_label: undefined,
      participants: undefined,
      selected_all: undefined,
      skip_participants: undefined,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const trimmedContent = trimCaseMessageContent(composerContent);
      const hasInitialMessage = hasMeaningfulCaseMessageContent(trimmedContent);

      await createCaseAsync({
        client_id: caseClientId as CaseId,
        ...values,
        ...(hasInitialMessage
          ? {
              initial_message: {
                client_id: generateClientId("CaseConversationMessage"),
                content: toBackendMessageContent(trimmedContent),
                plain_text: toBackendPlainText(trimmedContent),
              },
            }
          : {}),
      });
      form.reset();
      setSelectedCaseType(null);
      setComposerContent({ parts: [] }, "");
      regenerateId();
    } catch {
      // Error toast is handled by useCreateCase onError
      // composerContent is intentionally NOT reset on failure (preserved for retry)
    }
  });

  return (
    <FormProvider {...form}>
      <form
        className="flex h-full flex-col"
        data-testid="case-creation-form"
        noValidate
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <CaseTypePickerTriggerField />
          <CaseInitialMessageComposer />
          <div
            className="rounded-2xl bg-card px-4 py-3 shadow-sm"
            data-testid="case-creation-images-section"
          >
            <EntityImagesProvider
              captureFlow="camera-to-editor"
              deleteMode="hard-delete"
              entityClientId={caseClientId}
              entityType="case"
            >
              <ImagePreviewGrid
                maxImages={6}
                testId="case-creation-images-grid"
              />
            </EntityImagesProvider>
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3">
          <button
            type="button"
            disabled={isPending}
            data-testid="case-creation-submit"
            className="flex w-full items-center justify-center rounded-2xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-50"
            onClick={() => void handleSubmit()}
          >
            {isPending ? "Creating…" : "Create case"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
