import { useMemo } from "react";
import { useController, useFormContext } from "react-hook-form";

import { useWorkingSectionPickerFlow } from "@beyo/working-sections";
import { resolveWorkingSectionShortcutsByMajorCategory } from "@beyo/working-sections";
import { filterWorkingSectionsForMajorCategory } from "@beyo/working-sections";
import { useSurfaceHeader } from "@beyo/hooks";
import {
  StagedFormNavigation,
  WorkingSectionShortcutBar,
} from "@beyo/ui";

import type { WorkingSectionAssignment } from "../types";

// Fixed edge-reveal distance for staged task-creation footers. The footer's
// actual padding still tracks live height via ResizeObserver inside StagedForm.
export const TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX = 50;

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
  const surfaceHeader = useSurfaceHeader();
  const { control } = useFormContext<AssignmentFooterFormValues>();
  const { field } = useController({
    name: "working_section_assignments",
    control,
    defaultValue: [],
  });
  const flow = useWorkingSectionPickerFlow();
  const availableSections = useMemo(
    () => filterWorkingSectionsForMajorCategory(flow.options, majorCategory),
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
    <div
      className="bg-background shadow-[0_-1px_0_0_var(--color-border)]"
      data-testid="task-creation-assignment-footer"
    >
      {showShortcutBar ? (
        <div className="px-4">
          <WorkingSectionShortcutBar
            shortcuts={shortcuts}
            availableSections={availableSections}
            selectedSectionIds={selectedSectionIds}
            onShortcutPress={handleShortcutPress}
            animationMode="translate"
            className="pb-3 pt-3"
            data-testid="task-creation-working-sections-shortcut-bar"
            trackClassName="mt-3"
          />
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
