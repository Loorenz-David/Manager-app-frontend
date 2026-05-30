import { ChevronRight, Plus, UsersRound } from "lucide-react";
import { type FieldError, useFormContext, useWatch } from "react-hook-form";

import { UserPill } from "@beyo/ui";

import { useCaseCreationFormContext } from "../providers/CaseCreationFormProvider";
import type {
  CaseCreationFormValues,
  ParticipantSelectionResult,
} from "../types";

const MAX_VISIBLE_PILLS = 1;

export function ParticipantPickerTriggerField(): React.JSX.Element {
  const {
    surfaceOpeners,
    selectedParticipants,
    setSelectedParticipants,
    participantsTotalCount,
    setParticipantsTotalCount,
  } = useCaseCreationFormContext();
  const form = useFormContext<CaseCreationFormValues>();

  const participants = useWatch({
    control: form.control,
    name: "participants",
  });
  const selectedAll = useWatch({ control: form.control, name: "selected_all" });
  const skipParticipants = useWatch({
    control: form.control,
    name: "skip_participants",
  });

  const selectedCount = selectedAll
    ? Math.max(
        0,
        (participantsTotalCount ?? 0) - (skipParticipants?.length ?? 0),
      )
    : (participants?.length ?? 0);

  const visiblePills = selectedAll
    ? []
    : selectedParticipants.slice(0, MAX_VISIBLE_PILLS);
  const overflowCount = selectedAll
    ? 0
    : Math.max(0, selectedParticipants.length - MAX_VISIBLE_PILLS);

  // errors.participants is typed as array errors by RHF; cast to read the refine-level message
  const participantsError = form.formState.errors.participants as
    | FieldError
    | undefined;

  function handleSaveSelection(result: ParticipantSelectionResult): void {
    form.setValue(
      "participants",
      result.participants.length > 0 ? result.participants : undefined,
      { shouldDirty: true },
    );
    form.setValue("selected_all", result.selectedAll ? true : undefined, {
      shouldDirty: true,
    });
    form.setValue(
      "skip_participants",
      result.skipParticipants.length > 0 ? result.skipParticipants : undefined,
      { shouldDirty: true },
    );

    setSelectedParticipants(result.selectedUsers);
    setParticipantsTotalCount(result.totalCount);
  }

  function handlePress(): void {
    surfaceOpeners.openParticipantPicker?.({
      currentParticipants: participants ?? [],
      currentSelectedAll: selectedAll ?? false,
      currentSkipParticipants: skipParticipants ?? [],
      onSave: handleSaveSelection,
    });
  }

  return (
    <div>
      <button
        type="button"
        data-testid="participant-picker-trigger"
        className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-left shadow-sm"
        onClick={handlePress}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg">
          <UsersRound
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {selectedCount > 0
              ? `Participants (${selectedCount})`
              : "Participants"}
          </span>

          {visiblePills.length > 0 ? (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {visiblePills.map((p) => (
                <UserPill
                  key={p.userId}
                  userName={p.username}
                  imageSrc={p.profilePicture}
                  data-testid={`participant-pill-${p.userId}`}
                />
              ))}
              {overflowCount > 0 ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--color-soft-container)] px-2.5 py-1 text-sm font-medium text-foreground"
                  data-testid="participant-pill-overflow"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  {overflowCount}
                </span>
              ) : null}
            </span>
          ) : selectedCount === 0 ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              No participants selected
            </span>
          ) : null}
        </span>

        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </button>

      {participantsError?.message ? (
        <p className="mt-1.5 px-1 text-xs text-destructive" role="alert">
          {participantsError.message}
        </p>
      ) : null}
    </div>
  );
}
