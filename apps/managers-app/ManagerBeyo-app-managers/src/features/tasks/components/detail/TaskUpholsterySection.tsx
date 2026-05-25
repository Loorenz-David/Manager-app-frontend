import { Pencil } from "lucide-react";

import { DashedInfoSection, SectionLabel } from '@/components/primitives';
import { ItemUpholsteryField } from "@/features/items";

import { useTaskDetailContext } from "../../providers/TaskDetailProvider";

export function TaskUpholsterySection(): React.JSX.Element | null {
  const {
    activeUpholstery,
    openUpholsteryAmountSheet,
    taskDetail,
    updateItemUpholstery,
  } = useTaskDetailContext();

  if (!taskDetail?.item) {
    return null;
  }

  return (
    <DashedInfoSection
      data-testid="task-detail-upholstery-section"
      className="py-4"
    >
      <SectionLabel as="h3" tone="muted">
        Selected Upholstery
      </SectionLabel>

      {activeUpholstery.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upholstery linked.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {activeUpholstery.map((entry) => (
            <div key={entry.client_id} className="flex flex-col gap-3">
              <ItemUpholsteryField
                description="Linked upholstery"
                disabled={
                  entry.activeRequirement?.state === "completed" ||
                  updateItemUpholstery.isPending
                }
                onChange={(newUpholsteryId) => {
                  if (newUpholsteryId === entry.upholstery_id) {
                    return;
                  }

                  updateItemUpholstery.mutate({
                    itemUpholsteryId: entry.client_id,
                    upholstery_id: newUpholsteryId,
                  });
                }}
                requirementState={entry.activeRequirement?.state ?? null}
                testId={`upholstery-field-${entry.client_id}`}
                title="Upholstery"
                value={entry.upholstery_id}
              />
              <div className="flex items-center justify-between gap-3 text-sm px-2">
                <span className="text-muted-foreground">
                  Amount{" "}
                  {entry.activeRequirement?.amount_meters ??
                    entry.amount_meters ??
                    "—"}{" "}
                  m
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                  onClick={() => openUpholsteryAmountSheet(entry.client_id)}
                >
                  <Pencil className="size-3.5" />
                  Edit amount
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashedInfoSection>
  );
}
