import { ChevronRight, Tag } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { useCaseCreationFormContext } from "../providers/CaseCreationFormProvider";
import type { CaseCreationFormValues } from "../types";

export function CaseTypePickerTriggerField(): React.JSX.Element {
  const { selectedCaseType, setSelectedCaseType, entityTypes, surfaceOpeners } =
    useCaseCreationFormContext();
  const form = useFormContext<CaseCreationFormValues>();
  const currentCaseTypeId = useWatch({
    control: form.control,
    name: "case_type_id",
  });

  function handlePress(): void {
    surfaceOpeners.openCaseTypePicker?.({
      entityTypes,
      currentCaseTypeId: currentCaseTypeId ?? null,
      onSelect: (selection) => {
        setSelectedCaseType(selection);
        form.setValue("case_type_id", selection.clientId, {
          shouldDirty: true,
        });
        form.setValue("type_label", selection.name, { shouldDirty: true });
      },
    });
  }

  return (
    <button
      type="button"
      data-testid="case-type-picker-trigger"
      className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-left shadow-sm"
      onClick={handlePress}
    >
      {selectedCaseType ? (
        <>
          {selectedCaseType.imageUrl ? (
            <img
              src={selectedCaseType.imageUrl}
              alt=""
              aria-hidden="true"
              className="size-10 shrink-0 rounded-lg object-contain"
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg ">
              <Tag
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {selectedCaseType.name}
            </span>
            {selectedCaseType.description ? (
              <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                {selectedCaseType.description}
              </span>
            ) : null}
          </span>
        </>
      ) : (
        <span className="flex-1 text-sm text-muted-foreground">
          Select case type
        </span>
      )}

      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  );
}
