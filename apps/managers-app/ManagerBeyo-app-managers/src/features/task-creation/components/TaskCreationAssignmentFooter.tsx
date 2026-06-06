import { useContext, useMemo } from "react";
import { useController, useFormContext } from "react-hook-form";

import { WorkingSectionShortcutBar } from "@/components/primitives";
import { useScrollVisibilityContext } from "@/components/primitives/scroll-visibility";
import { StagedFormNavigation } from "@/components/primitives/staged-form/StagedFormNavigation";
import { resolveWorkingSectionShortcutsByMajorCategory } from "@/features/working-sections";
import { SurfaceHeaderContext } from "@/providers/SurfaceProvider";
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
  const surfaceHeader = useContext(SurfaceHeaderContext);
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
  const shortcuts = useMemo(
    () => resolveWorkingSectionShortcutsByMajorCategory(majorCategory),
    [majorCategory],
  );
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
            "grid overflow-hidden px-4 transition-[grid-template-rows] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isHidden ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
          )}
        >
          <div className="min-h-0">
            <WorkingSectionShortcutBar
              shortcuts={shortcuts}
              availableSections={availableSections}
              selectedSectionIds={selectedSectionIds}
              onShortcutPress={handleShortcutPress}
              animationMode="translate"
              className="pt-3 pb-3"
              data-testid="task-creation-working-sections-shortcut-bar"
              trackClassName="mt-3"
            />
          </div>
        </div>
      ) : null}

      <StagedFormNavigation
        className="border-t-0"
        closeLabel="Close & Back"
        onClose={surfaceHeader?.requestClose}
      />
    </div>
  );
}
