import { BackendImage, ContentCard, ImagePlaceholder, StatePill } from "@beyo/ui";
import { cn } from "@beyo/lib";

import { useTaskWorkingSectionsContext } from "../providers/TaskWorkingSectionsProvider";
import { formatWorkingDuration } from "../lib/format-working-duration";

function TaskWorkingSectionsEmptyState({
  message,
}: {
  message: string;
}): React.JSX.Element {
  return (
    <ContentCard>
      <p className="px-4 py-6 text-sm text-muted-foreground">{message}</p>
    </ContentCard>
  );
}

export function TaskWorkingSectionsStepList(): React.JSX.Element {
  const controller = useTaskWorkingSectionsContext();

  if (controller.isSectionsLoading && controller.sectionEntries.length === 0) {
    return <TaskWorkingSectionsEmptyState message="Loading working sections…" />;
  }

  if (controller.sectionEntries.length === 0) {
    return (
      <TaskWorkingSectionsEmptyState message="No working sections match this task's item category." />
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      data-testid="task-working-sections-step-list"
    >
      {controller.sectionEntries.map((entry) => {
        return (
          <div key={entry.section.client_id} className="relative px-2 pt-2">
            {entry.stateLabel ? (
              <div className="pointer-events-none absolute left-0 top-0 z-10">
                <StatePill
                  label={entry.stateLabel}
                  variant={entry.stateVariant}
                />
              </div>
            ) : null}

            <button
              type="button"
              className={cn(
                "flex w-full items-stretch overflow-hidden rounded-2xl border text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                entry.isActive
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-card)]"
                  : "border-border bg-card hover:bg-muted/20",
              )}
              data-testid={`task-working-section-entry-${entry.section.client_id}`}
              onClick={() =>
                controller.handleSectionPress(entry.section.client_id)
              }
            >
              <div className="w-20 shrink-0 overflow-hidden">
                <BackendImage
                  aria-hidden="true"
                  className="size-full object-cover"
                  fallback={
                    <ImagePlaceholder
                      className="bg-transparent"
                      iconClassName="size-5 opacity-50"
                    />
                  }
                  src={entry.section.image}
                />
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm font-medium",
                        entry.isActive
                          ? "text-[var(--color-card)]"
                          : "text-foreground",
                      )}
                    >
                      {entry.section.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
                      <span
                        className={cn(
                          "tabular-nums",
                          entry.isActive
                            ? "text-[var(--color-card)]/80"
                            : "text-muted-foreground",
                        )}
                        data-testid={`task-working-section-working-time-${entry.section.client_id}`}
                      >
                        {formatWorkingDuration(entry.totalWorkingSeconds)}
                      </span>
                      {entry.recordedTimeMarkedWrong ? (
                        <span
                          className={cn(
                            "flex items-center gap-1.5",
                            entry.isActive
                              ? "text-[var(--color-card)]"
                              : "text-[var(--color-warning)]",
                          )}
                          data-testid={`task-working-section-time-flag-${entry.section.client_id}`}
                        >
                          <span aria-hidden="true">•</span>
                          <span>Inaccurate</span>
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {entry.assignedMember ? (
                    <span
                      className={cn(
                        "mt-1 flex items-center gap-1 text-xs",
                        entry.isActive
                          ? "text-[var(--color-card)]/80"
                          : "text-muted-foreground",
                      )}
                    >
                      <BackendImage
                        aria-hidden="true"
                        className="size-4 shrink-0 rounded-full object-cover"
                        fallback={
                          <div
                            aria-hidden="true"
                            className={cn(
                              "size-4 shrink-0 rounded-full",
                              entry.isActive
                                ? "bg-[var(--color-card)]/20"
                                : "bg-muted",
                            )}
                          />
                        }
                        src={entry.assignedMember.profile_picture}
                      />
                      <span className="truncate">
                        {entry.assignedMember.username}
                      </span>
                    </span>
                  ) : (
                    <p
                      className={cn(
                        "mt-1 truncate text-xs",
                        entry.isActive
                          ? "text-[var(--color-card)]/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {entry.isActive
                        ? "No worker assigned"
                        : entry.isCompleted
                          ? "Completed. Tap to add a new step."
                          : "Tap to add this section"}
                    </p>
                  )}
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
