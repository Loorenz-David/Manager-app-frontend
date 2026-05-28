import { useMemo } from "react";
import { useController, useFormContext } from "react-hook-form";

import { WorkingSectionShortcutBar } from "@/components/primitives";
import { useScrollVisibilityContext } from "@/components/primitives/scroll-visibility";
import { StagedFormNavigation } from "@/components/primitives/staged-form/StagedFormNavigation";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "@/features/working-sections";
import { useWorkingSectionPickerFlow } from "@/features/working-sections/flows/use-working-section-picker.flow";
import type { WorkingSectionAssignment } from "@/features/working-sections/types";
import { cn } from "@/lib/utils";

type TaskCreationAssignmentFooterProps = {
  activeStepId: string;
  majorCategory?: string;
};

type AssignmentFooterFormValues = {
  working_section_assignments: WorkingSectionAssignment[];
};

export function TaskCreationAssignmentFooter({
  activeStepId,
  majorCategory,
}: TaskCreationAssignmentFooterProps): React.JSX.Element {
  const { control } = useFormContext<AssignmentFooterFormValues>();
  const { field } = useController({
    name: "working_section_assignments",
    control,
    defaultValue: [],
  });
  const flow = useWorkingSectionPickerFlow();
  const { isHidden } = useScrollVisibilityContext();
  const availableSections = useMemo(
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
  const showShortcutBar =
    activeStepId === "assignment" && availableSections.length > 0;
  const selectedSectionIds = (field.value ?? []).map(
    (assignment) => assignment.working_section_id,
  );

  function handleShortcutPress(sectionIds: string[]) {
    field.onChange(
      sectionIds.map((sectionId) => ({
        working_section_id: sectionId,
        assigned_worker_id: null,
      })),
    );
  }

  return (
    <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
      {showShortcutBar ? (
        <div
          className={cn(
            "overflow-hidden px-4 transition-[max-height,margin,padding,opacity] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isHidden
              ? "mb-0 max-h-0 pt-0 opacity-0"
              : "mb-3 max-h-24 pt-3 opacity-100",
          )}
        >
          <div
            className={cn(
              "transition-transform duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
              isHidden ? "translate-y-full" : "translate-y-0",
            )}
          >
            <WorkingSectionShortcutBar
              shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
              availableSections={availableSections}
              selectedSectionIds={selectedSectionIds}
              onShortcutPress={handleShortcutPress}
              animationMode="translate"
              data-testid="task-creation-working-sections-shortcut-bar"
              trackClassName="mt-3"
            />
          </div>
        </div>
      ) : null}

      <StagedFormNavigation className="border-t-0" />
    </div>
  );
}
