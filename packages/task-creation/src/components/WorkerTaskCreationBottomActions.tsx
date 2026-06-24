import { useSurfaceHeader } from "@beyo/hooks";

type WorkerTaskCreationBottomActionsProps = {
  isSubmitting?: boolean;
};

export function WorkerTaskCreationBottomActions({
  isSubmitting = false,
}: WorkerTaskCreationBottomActionsProps): React.JSX.Element {
  const header = useSurfaceHeader();

  return (
    <div
      className="bg-background shadow-[0_-1px_0_0_var(--color-border)]"
      data-testid="worker-task-creation-bottom-actions"
    >
      <div className="flex gap-3 px-4 pb-4 pt-3">
        <button
          className="flex-1 rounded-2xl border border-between-border bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm"
          type="button"
          onClick={() => header?.requestClose()}
        >
          Close & Back
        </button>
        <button
          className="flex-1 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm disabled:opacity-60"
          data-testid="worker-task-create-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creating..." : "Create"}
        </button>
      </div>
      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
    </div>
  );
}
