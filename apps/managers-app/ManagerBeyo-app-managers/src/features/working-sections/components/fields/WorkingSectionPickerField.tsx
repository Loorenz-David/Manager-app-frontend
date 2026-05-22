import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { FieldErrorPill } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { TEST_WORKING_SECTIONS } from '../../working-sections-test-data';
import {
  WORKING_SECTION_WORKER_PICKER_SURFACE_ID,
  preloadWorkingSectionWorkerPickerSurface,
} from '../../surfaces';
import type {
  WorkingSectionAssignment,
  WorkingSectionMember,
  WorkingSectionOption,
} from '../../types';

type WorkingSectionBoxProps = {
  section: WorkingSectionOption;
  isSelected: boolean;
  selectedMember: WorkingSectionMember | null;
  onPress: (sectionId: string) => void;
  onDeselect: (sectionId: string) => void;
};

function WorkingSectionBox({
  section,
  isSelected,
  selectedMember,
  onPress,
  onDeselect,
}: WorkingSectionBoxProps): React.JSX.Element {
  return (
    <div
      aria-pressed={isSelected}
      className={cn(
        'relative flex min-h-14 w-full cursor-pointer select-none items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isSelected ? 'border-primary bg-primary text-card' : 'border-border bg-card text-foreground',
      )}
      data-testid={`working-section-box-${section.client_id}`}
      role="button"
      tabIndex={0}
      onClick={() => onPress(section.client_id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPress(section.client_id);
        }
      }}
    >
      <img
        alt=""
        aria-hidden="true"
        className="size-8 shrink-0 rounded-lg object-cover"
        src={section.image}
      />

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium">{section.name}</span>
        {selectedMember ? (
          <span className="flex items-center gap-1">
            <img
              alt=""
              aria-hidden="true"
              className="size-4 shrink-0 rounded-full object-cover"
              src={selectedMember.profile_picture}
            />
            <span className="truncate text-xs opacity-80">{selectedMember.username}</span>
          </span>
        ) : null}
      </span>

      {isSelected ? (
        <button
          aria-label={`Remove ${section.name}`}
          className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-full p-1 opacity-70 hover:opacity-100"
          data-testid={`working-section-box-${section.client_id}-remove`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDeselect(section.client_id);
          }}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

export function WorkingSectionPickerField(): React.JSX.Element {
  const { control } = useFormContext();
  const { field, fieldState } = useController({
    name: 'working_section_assignments',
    control,
    defaultValue: [],
  });

  const currentAssignments: WorkingSectionAssignment[] = field.value ?? [];
  const selectedSectionIds = currentAssignments.map((assignment) => assignment.working_section_id);

  useEffect(() => {
    void preloadWorkingSectionWorkerPickerSurface();
  }, []);

  function handleSectionPress(sectionId: string) {
    const section = TEST_WORKING_SECTIONS.find((entry) => entry.client_id === sectionId);
    if (!section) {
      return;
    }

    const currentAssignment = currentAssignments.find(
      (assignment) => assignment.working_section_id === sectionId,
    );

    if (section.members.length === 1) {
      const member = section.members[0];
      const next = currentAssignments.filter((assignment) => assignment.working_section_id !== sectionId);

      field.onChange([
        ...next,
        { working_section_id: sectionId, assigned_worker_id: member.client_id },
      ]);
      return;
    }

    useSurfaceStore.getState().open(WORKING_SECTION_WORKER_PICKER_SURFACE_ID, {
      sectionName: section.name,
      members: section.members,
      currentWorkerId: currentAssignment?.assigned_worker_id ?? null,
      onSelect: (workerId: string) => {
        const next = currentAssignments.filter((assignment) => assignment.working_section_id !== sectionId);

        field.onChange([
          ...next,
          { working_section_id: sectionId, assigned_worker_id: workerId },
        ]);
      },
    });
  }

  function handleSectionDeselect(sectionId: string) {
    field.onChange(
      currentAssignments.filter((assignment) => assignment.working_section_id !== sectionId),
    );
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="working-section-picker-field">
      <span className="text-sm font-medium text-muted-foreground">Working sections</span>

      <div className="flex flex-col gap-2" data-testid="working-section-picker-list">
        {TEST_WORKING_SECTIONS.map((section) => {
          const isSelected = selectedSectionIds.includes(section.client_id);
          const assignment = currentAssignments.find(
            (entry) => entry.working_section_id === section.client_id,
          );
          const selectedMember = assignment
            ? section.members.find((member) => member.client_id === assignment.assigned_worker_id) ?? null
            : null;

          return (
            <WorkingSectionBox
              key={section.client_id}
              isSelected={isSelected}
              section={section}
              selectedMember={selectedMember}
              onDeselect={handleSectionDeselect}
              onPress={handleSectionPress}
            />
          );
        })}
      </div>

      <FieldErrorPill
        data-testid="working-section-picker-error"
        message={fieldState.error?.message}
      />
    </div>
  );
}
