import { Sparkles, X } from 'lucide-react';
import { useController, useFormContext } from 'react-hook-form';

import { FieldErrorPill } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

import { useNeedsCleaningPickerFlow } from '../../flows/use-needs-cleaning-picker.flow';
import { usePreloadSurface } from '@/hooks/use-preload-surface';
import {
  WORKING_SECTION_WORKER_PICKER_SURFACE_ID,
  preloadWorkingSectionWorkerPickerSurface,
} from '../../surfaces';

function findCandidate(
  candidates: ReturnType<typeof useNeedsCleaningPickerFlow>['candidates'],
  workerId: string,
) {
  return candidates.find((candidate) => candidate.member.client_id === workerId) ?? null;
}

export function NeedsCleaningPickerField(): React.JSX.Element {
  const { control } = useFormContext();
  const flow = useNeedsCleaningPickerFlow();
  const { field, fieldState } = useController({
    name: 'needs_cleaning_assignment',
    control,
    defaultValue: null,
  });

  usePreloadSurface(preloadWorkingSectionWorkerPickerSurface);

  const selectedCandidate =
    field.value === null || field.value === undefined
      ? null
      : flow.candidates.find(
          (candidate) =>
            candidate.workingSectionId === field.value.working_section_id &&
            candidate.member.client_id === field.value.assigned_worker_id,
        ) ?? null;

  function handlePress(): void {
    if (flow.sections.length === 0) {
      return;
    }

    if (flow.candidates.length === 0) {
      field.onChange({
        working_section_id: flow.sections[0].client_id,
        assigned_worker_id: null,
      });
      return;
    }

    if (flow.candidates.length === 1) {
      const candidate = flow.candidates[0];
      field.onChange({
        working_section_id: candidate.workingSectionId,
        assigned_worker_id: candidate.member.client_id,
      });
      return;
    }

    useSurfaceStore.getState().open(WORKING_SECTION_WORKER_PICKER_SURFACE_ID, {
      sectionName: 'Cleaning workers',
      members: flow.members,
      currentWorkerId: field.value?.assigned_worker_id ?? null,
      onSelect: (workerId: string) => {
        const candidate = findCandidate(flow.candidates, workerId);
        if (!candidate) return;

        field.onChange({
          working_section_id: candidate.workingSectionId,
          assigned_worker_id: candidate.member.client_id,
        });
      },
    });
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="needs-cleaning-picker-field">
      <div
        aria-disabled={!field.value && flow.sections.length === 0}
        aria-pressed={field.value !== null && field.value !== undefined}
        className={cn(
          'relative flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'cursor-pointer select-none',
          !field.value && flow.sections.length === 0 && 'cursor-not-allowed opacity-50',
          field.value ? 'border-primary bg-primary text-card' : 'border-border bg-card text-foreground',
        )}
        data-testid="needs-cleaning-picker-card"
        role="button"
        tabIndex={0}
        onClick={handlePress}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handlePress();
          }
        }}
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            field.value ? 'bg-white/16 text-card' : 'bg-muted text-icon',
          )}
        >
          <Sparkles className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium">Needs cleaning</span>
          {selectedCandidate ? (
            <span className="flex items-center gap-2">
              {selectedCandidate.member.profile_picture ? (
                <img
                  alt=""
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-full object-cover"
                  src={selectedCandidate.member.profile_picture}
                />
              ) : (
                <div aria-hidden="true" className="size-4 shrink-0 rounded-full bg-muted" />
              )}
              <span
                className={cn(
                  'truncate text-xs',
                  field.value ? 'text-card/80' : 'text-muted-foreground',
                )}
              >
                {selectedCandidate.member.username}
              </span>
            </span>
          ) : (
            <span
              className={cn(
                'truncate text-xs transition-colors duration-150',
                field.value ? 'text-card/80' : 'text-muted-foreground',
              )}
            >
              {field.value
                ? 'No worker selected'
                : flow.isLoading
                  ? 'Loading workers…'
                  : 'Tap to assign'}
            </span>
          )}
        </span>

        {field.value ? (
          <button
            type="button"
            aria-label="Clear cleaning assignment"
            className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-full p-1 opacity-70 hover:opacity-100"
            data-testid="needs-cleaning-picker-clear"
            onClick={(event) => {
              event.stopPropagation();
              field.onChange(null);
            }}
          >
            <X className="size-3" />
          </button>
        ) : null}
      </div>

      <FieldErrorPill
        data-testid="needs-cleaning-picker-error"
        message={fieldState.error?.message}
      />
    </div>
  );
}
