import { useEffect } from "react";

import { useStagedForm, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { cn } from "@beyo/lib";
import { TaskListCard } from "@beyo/tasks";
import { ContentCard, StagedForm, StagedFormStep } from "@beyo/ui";

import { EmailComposer } from "@beyo/emails";

import { useCustomerCoordinationEmailSlideController } from "../controllers/use-customer-coordination-email-slide.controller";
import type { CustomerCoordinationEmailSlideSurfaceProps } from "../surface-ids";
import type { TaskListItemWithCoordinationRaw } from "../types";

const SLIDE_STEPS = [
  { id: "tasks", title: "Tasks" },
  { id: "email", title: "Email" },
];

function resolveImageUrl(
  images: TaskListItemWithCoordinationRaw["item_images"],
): string | null {
  const first = images[0];

  if (!first || typeof first.image_url !== "string") {
    return null;
  }

  return first.image_url;
}

function CustomerCoordinationFooter({
  activeStepId,
  selectedCount,
  isSending,
  sendDisabled,
  onClose,
  onBack,
  onNext,
  onSend,
}: {
  activeStepId: string;
  selectedCount: number;
  isSending: boolean;
  sendDisabled: boolean;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onSend: () => void;
}): React.JSX.Element {
  return (
    <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
      <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
        {activeStepId === "tasks" ? (
          <button
            className="rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
            type="button"
            onClick={onClose}
          >
            Close & Back
          </button>
        ) : (
          <button
            className="rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
            type="button"
            onClick={onBack}
          >
            Back
          </button>
        )}

        {activeStepId === "tasks" ? (
          <button
            className={cn(
              "rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed",
              selectedCount > 0
                ? "bg-(--color-primary) text-card"
                : "bg-muted text-muted-foreground opacity-50",
            )}
            disabled={selectedCount === 0}
            type="button"
            onClick={onNext}
          >
            {selectedCount > 0 ? `Next (${selectedCount})` : "Next"}
          </button>
        ) : (
          <button
            className="rounded-2xl bg-(--color-primary) px-5 py-3.5 text-md font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
            disabled={sendDisabled}
            type="button"
            onClick={onSend}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        )}
      </div>

      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
    </div>
  );
}

export function CustomerCoordinationEmailSlidePage(): React.JSX.Element {
  const props = useSurfaceProps<CustomerCoordinationEmailSlideSurfaceProps>();
  const header = useSurfaceHeader();
  const controller = useCustomerCoordinationEmailSlideController({
    surfaceOpeners: props.surfaceOpeners,
  });
  const staged = useStagedForm({
    steps: SLIDE_STEPS,
    mode: "free",
  });

  useEffect(() => {
    header?.setHeaderHidden(true);
    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  async function handleSend(): Promise<void> {
    const result = await controller.handleSend();

    if (!result) {
      return;
    }

    staged.navigateTo("tasks");

    if (result.remainingTaskCount === 0) {
      controller.closeSurface?.();
    }
  }

  return (
    <div className="flex h-full flex-col py-4">
      <StagedForm
        activeStepId={staged.activeStepId}
        direction={staged.direction}
        footer={
          <CustomerCoordinationFooter
            activeStepId={staged.activeStepId}
            isSending={controller.isSending}
            selectedCount={controller.selectedTaskIds.length}
            sendDisabled={controller.sendDisabled}
            onBack={() => {
              staged.navigateTo("tasks");
            }}
            onClose={() => {
              controller.closeSurface?.();
            }}
            onNext={() => {
              staged.navigateTo("email");
            }}
            onSend={() => {
              void handleSend();
            }}
          />
        }
        isAdvancing={staged.isAdvancing}
        isFirstStep={staged.isFirstStep}
        isLastStep={staged.isLastStep}
        navigationMode="free"
        onAdvance={() => {}}
        onBack={staged.back}
        onNavigate={staged.navigateTo}
        showNavigation={false}
        stepStatusMap={staged.stepStatusMap}
        steps={staged.steps}
      >
        <StagedFormStep id="tasks" className="px-0">
          <div className="flex flex-col gap-3 pb-10 pt-3">
            {controller.isInitialLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="mx-4 h-30 animate-pulse rounded-xl bg-muted"
                />
              ))
            ) : controller.isError ? (
              <div className="mx-4">
                <ContentCard>
                  <div className="flex flex-col gap-3 px-4 py-6">
                    <p className="text-sm text-muted-foreground">
                      Pending coordination tasks could not be loaded.
                    </p>
                    <button
                      className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
                      type="button"
                      onClick={() => {
                        void controller.refetch();
                      }}
                    >
                      Try again
                    </button>
                  </div>
                </ContentCard>
              </div>
            ) : controller.tasks.length === 0 ? (
              <div className="mx-4">
                <ContentCard>
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    No pending coordination tasks are ready for email.
                  </p>
                </ContentCard>
              </div>
            ) : (
              controller.tasks.map((task) => (
                <TaskListCard
                  key={task.task.client_id}
                  batchMode
                  imageUrl={resolveImageUrl(task.item_images)}
                  isSelected={controller.selectedTaskIds.includes(
                    task.task.client_id,
                  )}
                  item={
                    task.primary_item
                      ? {
                          itemId: task.primary_item.client_id,
                          article_number: task.primary_item.article_number,
                          sku: task.primary_item.sku,
                          item_major_category_snapshot:
                            task.primary_item.item_major_category_snapshot,
                          quantity: task.primary_item.quantity,
                        }
                      : null
                  }
                  onToggleSelect={controller.toggleTaskSelection}
                  onTapCard={controller.openTaskDetail}
                  onTapImage={() => {
                    controller.openImageViewer(task);
                  }}
                  task={{
                    task_type: task.task.task_type,
                    state: task.task.state,
                    return_source: task.task.return_source,
                    ready_by_at: task.task.ready_by_at,
                  }}
                  taskId={task.task.client_id}
                />
              ))
            )}

            {controller.hasMore || controller.isFetchingMore ? (
              <div className="flex justify-center pb-6">
                <button
                  className="rounded-full bg-card px-6 py-2 text-sm font-medium text-foreground shadow-sm disabled:opacity-50"
                  disabled={controller.isFetchingMore}
                  type="button"
                  onClick={controller.loadMore}
                >
                  {controller.isFetchingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            ) : null}
          </div>
        </StagedFormStep>

        <StagedFormStep id="email" className="px-0">
          <div className=" pb-10 pt-3">
            <ContentCard>
              <div className=" py-4">
                <EmailComposer
                  disabled={controller.isSending}
                  selectedTemplate={controller.selectedTemplate}
                  surfaceOpeners={props.surfaceOpeners}
                  subject={controller.subject}
                  textBody={controller.textBody}
                  onSelectTemplate={controller.applyTemplate}
                  onSubjectChange={controller.setSubject}
                  onTextBodyChange={controller.setTextBody}
                />
              </div>
            </ContentCard>
          </div>
        </StagedFormStep>
      </StagedForm>
    </div>
  );
}
