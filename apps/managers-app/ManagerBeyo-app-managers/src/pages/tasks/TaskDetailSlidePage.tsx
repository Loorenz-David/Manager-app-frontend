import { useEffect } from "react";
import { TaskFlowTimeline } from "@beyo/tasks";
import { PullToRefresh, useScrollVisibility } from "@beyo/ui";

import { ContentCard, DashedInfoGroup } from "@/components/primitives";
import {
  TaskBodyCategoryRow,
  TaskCustomerSection,
  TaskDetailBottomActions,
  TaskDetailHeader,
  TaskImagesSection,
  TaskScheduledDeliverySection,
  TaskUpholsterySection,
  TaskWorkingSectionsField,
} from "@/features/tasks/components/detail";
import {
  TaskDetailProvider,
  useTaskDetailContext,
} from "@/features/tasks/providers/TaskDetailProvider";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import type { TaskDetailSurfaceProps } from "@/features/tasks/surfaces";

function TaskDetailSlidePageContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useTaskDetailContext();
  const { scrollRef, isHidden } = useScrollVisibility({
    mode: "relative",
    hideThreshold: 40,
    showThreshold: 24,
  });

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !(window as Window & { __BEYO_SCROLL_DEBUG__?: boolean })
        .__BEYO_SCROLL_DEBUG__
    ) {
      return;
    }

    console.log("[scroll-debug][task-detail] isHidden", { isHidden });
  }, [isHidden]);

  let scrollContent: React.ReactNode;

  if (controller.isPending) {
    scrollContent = (
      <div className="p-6 text-sm text-muted-foreground">Loading task…</div>
    );
  } else if (controller.isError || !controller.taskDetail) {
    scrollContent = (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Task details could not be loaded.
        </p>
        <button
          type="button"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          onClick={() => {
            void controller.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  } else {
    scrollContent = (
      <div className="flex flex-col gap-4 pb-[calc(var(--safe-bottom,0)+9.5rem)] pt-2">
        <TaskDetailHeader />
        <ContentCard>
          <TaskBodyCategoryRow />
          <DashedInfoGroup>
            <TaskCustomerSection />
            <TaskWorkingSectionsField />
            <TaskScheduledDeliverySection />
          </DashedInfoGroup>
          <TaskImagesSection />
          {controller.taskDetail?.item?.item_major_category_snapshot?.toLowerCase() ===
            "seat" && <TaskUpholsterySection />}
          <TaskFlowTimeline
            taskId={controller.taskId}
            onRecordPress={controller.openFlowRecord}
            initialLimit={3}
            loadMoreSize={5}
          />
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <PullToRefresh
        className="min-h-0 flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        {scrollContent}
      </PullToRefresh>
      <TaskDetailBottomActions isHidden={isHidden} />
    </div>
  );
}

export function TaskDetailSlidePage(): React.JSX.Element {
  const { taskId } = useSurfaceProps<TaskDetailSurfaceProps>();

  if (!taskId) {
    return (
      <div
        className="p-6 text-sm text-muted-foreground"
        data-testid="task-detail-slide"
      >
        Task id is missing.
      </div>
    );
  }

  return (
    <div className="h-full bg-background" data-testid="task-detail-slide">
      <TaskDetailProvider taskId={taskId}>
        <TaskDetailSlidePageContent />
      </TaskDetailProvider>
    </div>
  );
}
