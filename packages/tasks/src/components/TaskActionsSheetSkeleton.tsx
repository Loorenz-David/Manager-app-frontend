function TaskActionsSheetSkeletonRow(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
    >
      <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
    </div>
  );
}

/**
 * Suspense fallback for the task actions sheet's own chunk load. Mirrors the
 * four rows TaskDetailMenuSheetPage always renders (Pin notifications,
 * Change task type, Change article number, Delete task) so the row count and
 * shape match instead of a generic title-and-paragraph placeholder.
 *
 * "Force ready" is intentionally excluded: its visibility depends on role and
 * task state that only resolve once the page itself has mounted, so it can't
 * be predicted before the chunk has loaded.
 */
export function TaskActionsSheetSkeleton(): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-4 p-6"
      data-testid="task-actions-sheet-skeleton"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <TaskActionsSheetSkeletonRow key={index} />
      ))}
    </div>
  );
}
