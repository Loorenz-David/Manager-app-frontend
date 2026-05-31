import { useMemo } from "react";
import { useController, useFormContext } from "react-hook-form";

import {
  FieldErrorPill,
  ImagePlaceholder,
  WorkingSectionShortcutBar,
} from "@/components/primitives";
import { useScrollVisibilityContext } from "@/components/primitives/scroll-visibility";
import { useWorkingSectionPickerFlow } from "@/features/working-sections/flows/use-working-section-picker.flow";
import { cn } from "@/lib/utils";
import type {
  WorkingSectionAssignment,
  WorkingSectionOption,
} from "../../types";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "../../constants/working-section-shortcuts";

type WorkingSectionBoxProps = {
  section: WorkingSectionOption;
  isSelected: boolean;
  onPress: (sectionId: string) => void;
};

function WorkingSectionBox({
  section,
  isSelected,
  onPress,
}: WorkingSectionBoxProps): React.JSX.Element {
  return (
    <div
      aria-pressed={isSelected}
      className={cn(
        "relative flex min-h-14 w-full cursor-pointer select-none items-stretch overflow-hidden rounded-xl border transition-colors duration-150 pl-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isSelected
          ? "border-primary bg-primary text-card"
          : "border-border bg-card text-foreground",
      )}
      data-testid={`working-section-box-${section.client_id}`}
      role="button"
      tabIndex={0}
      onClick={() => onPress(section.client_id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPress(section.client_id);
        }
      }}
    >
      {section.image ? (
        <div
          aria-hidden="true"
          className="w-16 self-stretch shrink-0 overflow-hidden"
        >
          <img
            alt=""
            aria-hidden="true"
            className="size-full object-cover"
            src={section.image}
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="w-16 self-stretch shrink-0 overflow-hidden"
        >
          <ImagePlaceholder
            className="bg-transparent"
            iconClassName="size-5 opacity-50"
          />
        </div>
      )}

      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-5">
        <span className="truncate text-sm font-medium">{section.name}</span>
      </span>
    </div>
  );
}

type WorkingSectionPickerFieldProps = {
  majorCategory?: string;
  showShortcutBar?: boolean;
};

export function WorkingSectionPickerField({
  majorCategory,
  showShortcutBar = true,
}: WorkingSectionPickerFieldProps = {}): React.JSX.Element {
  const { control } = useFormContext();
  const flow = useWorkingSectionPickerFlow();
  const { isHidden } = useScrollVisibilityContext();
  const { field, fieldState } = useController({
    name: "working_section_assignments",
    control,
    defaultValue: [],
  });
  const displayedOptions = useMemo(
    () =>
      majorCategory === undefined
        ? flow.options
        : flow.options.filter((section) =>
            section.item_categories.some(
              (itemCategory) => itemCategory.major_category === majorCategory,
            ),
          ),
    [flow.options, majorCategory],
  );

  const currentAssignments: WorkingSectionAssignment[] = field.value ?? [];
  const selectedSectionIds = currentAssignments.map(
    (assignment) => assignment.working_section_id,
  );

  function handleSectionPress(sectionId: string) {
    const isSelected = selectedSectionIds.includes(sectionId);
    if (isSelected) {
      field.onChange(
        currentAssignments.filter(
          (assignment) => assignment.working_section_id !== sectionId,
        ),
      );
      return;
    }

    field.onChange([
      ...currentAssignments,
      { working_section_id: sectionId, assigned_worker_id: null },
    ]);
  }

  function handleShortcutPress(resolvedIds: string[]) {
    field.onChange(
      resolvedIds.map((sectionId) => ({
        working_section_id: sectionId,
        assigned_worker_id: null,
      })),
    );
  }

  return (
    <div
      className="flex flex-col gap-1.5"
      data-testid="working-section-picker-field"
    >
      <span className="text-sm font-medium text-muted-foreground">
        Working sections
      </span>

      <div
        className="flex flex-col gap-3"
        data-testid="working-section-picker-list"
      >
        {flow.isLoading && displayedOptions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Loading working sections…
          </p>
        ) : null}
        {displayedOptions.map((section) => {
          const isSelected = selectedSectionIds.includes(section.client_id);

          return (
            <WorkingSectionBox
              key={section.client_id}
              isSelected={isSelected}
              section={section}
              onPress={handleSectionPress}
            />
          );
        })}
      </div>

      {showShortcutBar ? (
        <div
          className={cn(
            "overflow-hidden transition-[max-height,padding,opacity] duration-300 ease-in-out",
            isHidden ? "max-h-0 pt-0 opacity-0" : "max-h-24 pt-1 opacity-100",
          )}
          data-testid="working-section-picker-shortcut-bar-container"
        >
          <WorkingSectionShortcutBar
            shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
            availableSections={displayedOptions}
            selectedSectionIds={selectedSectionIds}
            onShortcutPress={handleShortcutPress}
            data-testid="working-section-picker-shortcut-bar"
          />
        </div>
      ) : null}

      <FieldErrorPill
        data-testid="working-section-picker-error"
        message={fieldState.error?.message}
      />
    </div>
  );
}
