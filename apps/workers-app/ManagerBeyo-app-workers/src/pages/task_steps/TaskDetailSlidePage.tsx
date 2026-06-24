import { useEffect } from "react";
import { usePreloadSurface, useSurfaceHeader } from "@beyo/hooks";
import { TaskFlowTimeline } from "@beyo/tasks";
import { ContentCard, PullToRefresh, useScrollVisibility } from "@beyo/ui";
import { cn } from "@beyo/lib";
import {
  TaskStepCircularActionButton,
  TaskStepDetailFooter,
  TaskStepDetailHeader,
  TaskStepImagesPreview,
  TaskStepItemDetailsSection,
  TaskStepUpholsterySection,
} from "@/features/task_steps/components/detail";
import {
  TaskStepDetailProvider,
  useTaskStepDetailContext,
} from "@/features/task_steps/providers/TaskStepDetailProvider";
import { preloadCompleteTaskStepConfirmationSlideSurface } from "@/features/task_steps/surfaces";

function TaskDetailSlidePageContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useTaskStepDetailContext();
  const { scrollRef, isHidden } = useScrollVisibility({ mode: "relative" });

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  usePreloadSurface(preloadCompleteTaskStepConfirmationSlideSurface);

  if (controller.isPending) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading task...</div>
    );
  }

  if (controller.isError || !controller.step || !controller.vm) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Could not load task details.
        </p>
      </div>
    );
  }

  const isStepTransitioning =
    controller.isTransitioning &&
    controller.transitioningStepId === controller.vm.stepId;
  const canShowCompletionAction = controller.vm.state === "working";

  return (
    <div className="relative flex h-full flex-col bg-background">
      <PullToRefresh
        className="flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none pb-[calc(var(--safe-bottom,0)+9.5rem)]"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div data-testid="task-detail-slide-page">
          <TaskStepDetailHeader />

          {!controller.isStepTerminal ? (
            <div className="flex flex-col items-center gap-2 px-6 py-4">
              <TaskStepCircularActionButton
                isTransitioning={isStepTransitioning}
                lastStateRecord={controller.vm.lastStateRecord}
                state={controller.vm.state}
                stepId={controller.vm.stepId}
                taskId={controller.vm.taskId}
                totalWorkingSeconds={controller.vm.totalWorkingSeconds}
                onTransition={controller.handleTransition}
              />
            </div>
          ) : null}

          <div className=" mt-1">
            <ContentCard gapClassName="gap-4">
              <TaskStepImagesPreview />

              <TaskStepItemDetailsSection />

              <TaskStepUpholsterySection />

              <div className="mt-5">
                <TaskFlowTimeline
                  taskId={controller.taskId}
                  onRecordPress={controller.handleOpenFlowRecord}
                  initialLimit={3}
                  loadMoreSize={5}
                />
              </div>
            </ContentCard>
          </div>
        </div>
      </PullToRefresh>

      {canShowCompletionAction ? (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-0 transition-transform duration-300",
            isHidden ? "translate-y-full" : "translate-y-0",
          )}
        >
          <div className="px-4 pb-21 pt-3">
            <button
              className="w-full rounded-xl py-3 text-center font-semibold transition-opacity disabled:opacity-60"
              data-testid="task-step-complete-button"
              disabled={isStepTransitioning}
              style={{
                backgroundColor: "#eaf8ef",
                color: "#1e7a46",
                border: "1px solid #9ed9b5",
              }}
              type="button"
              onClick={controller.handleComplete}
            >
              Complete task
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 transition-transform duration-300",
          isHidden ? "translate-y-full" : "translate-y-0",
        )}
      >
        <TaskStepDetailFooter
          unreadCount={controller.liveCasesSummary.totalUnread}
          isScrollHidden={isHidden}
          onOpenCases={controller.handleOpenCasesForTask}
          onClose={() => header?.requestClose()}
        />
      </div>
    </div>
  );
}

export function TaskDetailSlidePage(): React.JSX.Element {
  return (
    <TaskStepDetailProvider>
      <TaskDetailSlidePageContent />
    </TaskStepDetailProvider>
  );
}
