import { useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useSurfaceHeader } from "@beyo/hooks";
import { useQueryClient } from "@tanstack/react-query";

import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
import { generateClientId } from "@beyo/lib";
import type { CaseId } from "@beyo/lib";

import { useCreateCase } from "../actions/use-create-case";
import { caseTypeKeys } from "../api/case-type-keys";
import { listCaseTypes } from "../api/list-case-types";
import { listUsers } from "../api/list-users";
import { userKeys } from "../api/user-keys";
import {
  hasMeaningfulCaseMessageContent,
  trimCaseMessageContent,
} from "../lib/case-lexical-serialization";
import { useParticipantAutoSelect } from "../lib/use-participant-auto-select";
import {
  toBackendMessageContent,
  toBackendPlainText,
} from "../lib/message-content-adapter";
import { useCaseCreationFormContext } from "../providers/CaseCreationFormProvider";
import { CaseCreationFormSchema, type CaseCreationFormValues } from "../types";
import { CaseInitialMessageComposer } from "./CaseInitialMessageComposer";
import { ParticipantPickerTriggerField } from "./ParticipantPickerTriggerField";
import { CaseTypePickerTriggerField } from "./CaseTypePickerTriggerField";

export function CaseCreationFormContent(): React.JSX.Element {
  const queryClient = useQueryClient();
  const header = useSurfaceHeader();
  const {
    caseClientId,
    regenerateId,
    entityTypes,
    entityClientId,
    selectedCaseType,
    setSelectedCaseType,
    composerContent,
    setComposerContent,
    setSelectedParticipants,
    setParticipantsTotalCount,
    surfaceOpeners,
    onCaseCreated,
  } = useCaseCreationFormContext();
  const { createCaseAsync, isPending } = useCreateCase();

  useEffect(() => {
    const params = { entity_type: entityTypes?.join(","), limit: 50 };

    void queryClient.prefetchQuery({
      queryKey: caseTypeKeys.list(params),
      queryFn: () => listCaseTypes(params),
    });
  }, [queryClient, entityTypes]);

  useEffect(() => {
    const params = { limit: 50, compact: true };

    void queryClient.prefetchQuery({
      queryKey: userKeys.list(params),
      queryFn: () => listUsers(params),
    });
  }, [queryClient]);

  const form = useForm<CaseCreationFormValues>({
    resolver: zodResolver(CaseCreationFormSchema),
    defaultValues: {
      case_type_id: selectedCaseType?.clientId || undefined,
      type_label: selectedCaseType?.name || undefined,
      participants: undefined,
      selected_all: undefined,
      skip_participants: undefined,
    },
  });

  const autoSelectResult = useParticipantAutoSelect();
  const caseTypeAutoOpenApplied = useRef(false);
  const participantAutoSelectApplied = useRef(false);

  useEffect(() => {
    if (caseTypeAutoOpenApplied.current) {
      return;
    }

    caseTypeAutoOpenApplied.current = true;

    if (selectedCaseType !== null) {
      return;
    }

    surfaceOpeners.openCaseTypePicker?.({
      entityTypes,
      currentCaseTypeId: null,
      onSelect: (selection) => {
        setSelectedCaseType(selection);
        form.setValue("case_type_id", selection.clientId, {
          shouldDirty: true,
        });
        form.setValue("type_label", selection.name, { shouldDirty: true });
      },
    });
  }, [
    surfaceOpeners,
    entityTypes,
    selectedCaseType,
    setSelectedCaseType,
    form,
  ]);

  useEffect(() => {
    if (autoSelectResult === null || participantAutoSelectApplied.current) {
      return;
    }

    participantAutoSelectApplied.current = true;

    form.setValue(
      "participants",
      autoSelectResult.participants.length > 0
        ? autoSelectResult.participants
        : undefined,
      { shouldDirty: false },
    );
    form.setValue(
      "selected_all",
      autoSelectResult.selectedAll ? true : undefined,
      {
        shouldDirty: false,
      },
    );
    form.setValue(
      "skip_participants",
      autoSelectResult.skipParticipants.length > 0
        ? autoSelectResult.skipParticipants
        : undefined,
      { shouldDirty: false },
    );

    setSelectedParticipants(autoSelectResult.selectedUsers);
    setParticipantsTotalCount(autoSelectResult.totalCount);
  }, [
    autoSelectResult,
    form,
    setSelectedParticipants,
    setParticipantsTotalCount,
  ]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const trimmedContent = trimCaseMessageContent(composerContent);
      const hasInitialMessage = hasMeaningfulCaseMessageContent(trimmedContent);

      await createCaseAsync({
        client_id: caseClientId as CaseId,
        ...values,
        ...(entityClientId && entityTypes?.[0]
          ? { entity_type: entityTypes[0], entity_client_id: entityClientId }
          : {}),
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

      onCaseCreated?.(
        hasInitialMessage ? toBackendPlainText(trimmedContent) : undefined,
      );

      form.reset();
      setSelectedCaseType(null);
      setComposerContent({ parts: [] }, "");
      regenerateId();
      setSelectedParticipants([]);
      setParticipantsTotalCount(null);
      header?.requestClose();
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
          <ParticipantPickerTriggerField />
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
