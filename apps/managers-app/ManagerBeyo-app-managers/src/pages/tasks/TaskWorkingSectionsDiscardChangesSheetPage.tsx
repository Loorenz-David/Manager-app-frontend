import { useSurfaceProps } from '@/hooks/use-surface-props';
import type { TaskWorkingSectionsDiscardChangesSurfaceProps } from '@/features/tasks/surfaces';

export function TaskWorkingSectionsDiscardChangesSheetPage(): React.JSX.Element {
  const { onDiscardAndClose, onSaveAndClose } =
    useSurfaceProps<TaskWorkingSectionsDiscardChangesSurfaceProps>();

  return (
    <div
      className="flex flex-col px-4 pb-4 pt-2"
      data-testid="task-working-sections-discard-sheet"
    >
      <p className="mb-4 px-2 text-sm text-muted-foreground">
        You have unsaved working section changes. If you close now, they will be lost.
      </p>

      <button
        aria-label="Save changes and close"
        className="mb-2 flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-sm font-medium text-background transition-opacity duration-150 hover:opacity-90"
        data-testid="task-working-sections-discard-sheet-save-button"
        type="button"
        onClick={onSaveAndClose}
      >
        Save &amp; Close
      </button>

      <button
        aria-label="Discard changes and close"
        className="flex h-12 w-full items-center justify-center rounded-2xl border border-border text-sm text-destructive transition-colors duration-150 hover:bg-destructive/10"
        data-testid="task-working-sections-discard-sheet-discard-button"
        type="button"
        onClick={onDiscardAndClose}
      >
        Discard changes
      </button>
    </div>
  );
}
