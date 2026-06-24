import { createElement, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { decodeTokenClaims } from "@beyo/api-client";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  celebrationPresets,
  useCelebration,
  YouDidItCelebrationIcon,
} from "@beyo/celebration";
import { ImagePlaceholder } from "@beyo/ui";
import { useUserLastActiveStepQuery } from "@/features/task_steps/api/use-user-last-active-step";
import { useTransitionBatchStepStates } from "@/features/task_steps/actions/use-transition-batch-step-states";
import { workerWorkingSectionKeys } from "@/features/working_sections/api/working-section-keys";
import type { WorkerWorkingSection } from "@/features/working_sections/types";
import {
  BATCH_DETAIL_SLIDE_SURFACE_ID,
  COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID,
  type BatchDetailSlideSurfaceProps,
  type CompleteBatchTaskStepsConfirmationSlideSurfaceProps,
} from "@/features/task_steps/surface-ids";
import {
  WorkingSectionStepsProvider,
  useWorkingSectionStepsContext,
} from "@/features/task_steps";
import { TaskStepCard } from "@/features/task_steps/components/TaskStepCard";
import {
  getBatchTransitionItems,
  toTaskStepCardViewModel,
  type TaskStep,
  type TaskStepCardViewModel,
} from "@/features/task_steps/types";

// Inner component that reads action handlers from context but renders only the live batch vms
function BatchStepList({
  batchVms,
}: {
  batchVms: TaskStepCardViewModel[];
}): React.JSX.Element {
  const {
    handleTransition,
    handleOpenTaskActions,
    handleOpenTaskDetail,
    handleOpenImageViewer,
    transitioningStepId,
  } = useWorkingSectionStepsContext();

  if (batchVms.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        No active steps.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-2 pb-24" data-testid="batch-detail-steps-list">
      {batchVms.map((card) => (
        <TaskStepCard
          key={card.stepId}
          card={card}
          transitioningStepId={transitioningStepId}
          onTapActions={handleOpenTaskActions}
          onTapCard={handleOpenTaskDetail}
          onTapImage={handleOpenImageViewer}
          onTransition={handleTransition}
        />
      ))}
    </div>
  );
}

export function BatchDetailSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  const { close, open: openSurface } = useSurface();
  const props = useSurfaceProps<BatchDetailSlideSurfaceProps>();
  const workingSectionId = props.workingSectionId!;
  const workingSectionNameSnapshot = props.workingSectionNameSnapshot ?? "";
  const batchStepIds = props.batchStepIds ?? [];

  // Live batch steps — derived from cache, refreshed after every mutation
  const { data: lastActivePayload } = useUserLastActiveStepQuery();
  const liveBatchSteps = useMemo<TaskStep[]>(
    () =>
      (lastActivePayload?.batchSteps ?? []).filter((s) =>
        batchStepIds.includes(s.client_id),
      ),
    [lastActivePayload?.batchSteps, batchStepIds],
  );

  const { trigger: triggerCelebration } = useCelebration();

  // Section image — look up from cached mine() data without firing a new query
  const queryClient = useQueryClient();
  const sectionsCache = queryClient.getQueryData<WorkerWorkingSection[]>(
    workerWorkingSectionKeys.mine(),
  );
  const sectionImageUrl =
    sectionsCache?.find((s) => s.client_id === workingSectionId)?.image ?? null;

  const {
    transitionBatch,
    transitionBatchAsync,
    isPending: isBatchTransitioning,
  } = useTransitionBatchStepStates();

  const batchVms = useMemo(
    () => liveBatchSteps.map(toTaskStepCardViewModel),
    [liveBatchSteps],
  );

  const batchHasWorking = liveBatchSteps.some((s) => s.state === "working");
  const targetState: "working" | "paused" = batchHasWorking ? "paused" : "working";
  const batchActionItems = getBatchTransitionItems(liveBatchSteps, targetState);
  const isBatchActionDisabled =
    batchActionItems.length === 0 || isBatchTransitioning;

  const workingSteps = liveBatchSteps.filter((s) => s.state === "working");

  const [isConfirmationPending, setIsConfirmationPending] = useState(false);

  function handleBatchAction() {
    if (batchActionItems.length === 0) return;
    transitionBatch({
      items: batchActionItems,
      new_state: targetState,
      reason: null,
      description: null,
      working_section_id: workingSectionId,
    });
  }

  function handleOpenCompleteBatchConfirmation() {
    if (workingSteps.length === 0) return;

    openSurface(COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID, {
      workingSectionId,
      workingSteps: workingSteps.map((s) => ({
        taskId: s.task_id,
        stepId: s.client_id,
        totalWorkingSeconds: s.total_working_seconds,
        totalPauseSeconds: s.total_pause_seconds,
        lastStateRecordEnteredAt: s.last_state_record?.entered_at ?? null,
      })),
      isPending: isConfirmationPending,
      onConfirm: async (markInaccurate: boolean) => {
        setIsConfirmationPending(true);
        try {
          const items = workingSteps.map((s) => ({
            task_id: s.task_id,
            step_id: s.client_id,
            ...(markInaccurate && { mark_closing_record_inaccurate: true }),
          }));
          await transitionBatchAsync({
            items,
            new_state: "completed",
            reason: null,
            description: null,
            working_section_id: workingSectionId,
          });
          // Post-completion close: confirmation slide first, then batch detail
          close(COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID);
          close(BATCH_DETAIL_SLIDE_SURFACE_ID);
          if (!markInaccurate) {
            const claims = decodeTokenClaims();
            triggerCelebration(
              celebrationPresets.TASK_COMPLETE(
                claims?.username ?? "",
                createElement(YouDidItCelebrationIcon, {
                  className: "h-48 w-auto text-white",
                  animated: true,
                  decorative: true,
                }),
              ),
            );
          }
        } finally {
          setIsConfirmationPending(false);
        }
      },
    } as CompleteBatchTaskStepsConfirmationSlideSurfaceProps);
  }

  const BatchActionIcon = batchHasWorking ? Pause : Play;

  return (
    <div
      className="relative flex h-full flex-col bg-background pb-[calc(var(--safe-bottom,0)+5rem)]"
      data-testid="batch-detail-slide"
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button
          aria-label="Back"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          data-testid="batch-detail-back"
          type="button"
          onClick={() => close(BATCH_DETAIL_SLIDE_SURFACE_ID)}
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
          {sectionImageUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              src={sectionImageUrl}
            />
          ) : (
            <ImagePlaceholder iconClassName="size-3.5 text-muted-foreground/60" />
          )}
        </div>

        <span
          className="truncate text-lg font-semibold text-foreground"
          data-testid="batch-detail-title"
        >
          {workingSectionNameSnapshot}
        </span>
      </header>

      {/* Circular batch action */}
      <div className="flex justify-center py-6">
        <div className="flex flex-col items-center gap-2">
          <button
            aria-label={batchHasWorking ? "Pause all" : "Resume all"}
            className={`flex size-24 items-center justify-center rounded-full transition-opacity disabled:opacity-60 ${
              batchHasWorking
                ? "bg-soft-container text-foreground shadow-md border border-light-border"
                : "bg-primary text-card shadow-md border border-light-border"
            }`}
            data-testid="batch-detail-action-button"
            disabled={isBatchActionDisabled}
            type="button"
            onClick={handleBatchAction}
          >
            <BatchActionIcon
              aria-hidden="true"
              className="size-8 shrink-0 fill-current stroke-none"
            />
          </button>
          <span className="text-sm text-muted-foreground">
            {batchHasWorking ? "Tap to pause all" : "Tap to resume all"}
          </span>
        </div>
      </div>

      {/* Step list — individual card actions work via WorkingSectionStepsProvider */}
      <div className="flex-1 overflow-y-auto">
        <WorkingSectionStepsProvider sectionId={workingSectionId}>
          <BatchStepList batchVms={batchVms} />
        </WorkingSectionStepsProvider>
      </div>

      {/* "Complete Tasks" footer */}
      <div className="absolute bottom-[calc(var(--safe-bottom,0)+1rem)] left-0 right-0 px-4">
        <button
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card shadow-lg transition-opacity disabled:opacity-60"
          data-testid="batch-detail-complete-button"
          disabled={workingSteps.length === 0 || isConfirmationPending}
          type="button"
          onClick={handleOpenCompleteBatchConfirmation}
        >
          {isConfirmationPending ? "Completing…" : "Complete Tasks"}
        </button>
      </div>
    </div>
  );
}
