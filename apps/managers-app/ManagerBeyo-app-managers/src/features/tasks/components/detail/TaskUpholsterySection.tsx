import { useMemo } from "react";
import { Pencil } from "lucide-react";
import { generateClientId } from "@beyo/lib";
import {
  useItemUpholsteryQuery,
  type UpholsteryRequirementEntry,
} from "@beyo/tasks";

import { DashedInfoSection, SectionLabel } from "@/components/primitives";
import { ItemUpholsteryField } from "@/features/items";

import { useTaskDetailContext } from "../../providers/TaskDetailProvider";

export function TaskUpholsterySection(): React.JSX.Element | null {
  const {
    createItemUpholstery,
    openUpholsteryAmountSheet,
    taskDetail,
    updateItemUpholstery,
  } = useTaskDetailContext();

  const queryItemId = taskDetail?.item?.client_id ?? null;
  const upholsteryQuery = useItemUpholsteryQuery(queryItemId);

  const requirementsById = useMemo(() => {
    const entries = upholsteryQuery.data?.requirements ?? [];
    return new Map<string, UpholsteryRequirementEntry>(
      entries.map((entry) => [entry.client_id, entry]),
    );
  }, [upholsteryQuery.data?.requirements]);

  const activeUpholstery = useMemo(
    () =>
      (upholsteryQuery.data?.upholstery ?? []).map((entry) => ({
        ...entry,
        activeRequirement: entry.active_requirement_id
          ? (requirementsById.get(entry.active_requirement_id) ?? null)
          : null,
      })),
    [requirementsById, upholsteryQuery.data?.upholstery],
  );

  if (!taskDetail?.item) {
    return null;
  }

  const itemId = taskDetail.item.client_id;

  return (
    <DashedInfoSection
      data-testid="task-detail-upholstery-section"
      className="py-4"
    >
      <SectionLabel as="h3" tone="muted">
        Selected Upholstery
      </SectionLabel>

      {activeUpholstery.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            No upholstery linked yet.
          </p>
          <ItemUpholsteryField
            disabled={createItemUpholstery.isPending}
            onChange={(newUpholsteryId) => {
              createItemUpholstery.mutate({
                client_id: generateClientId("ItemUpholstery"),
                item_id: itemId,
                upholstery_id: newUpholsteryId,
                source: "internal",
              });
            }}
            placeholder="Select upholstery"
            testId="upholstery-field-empty"
            value={null}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeUpholstery.map((entry) => (
            <div key={entry.client_id} className="flex flex-col gap-3">
              <ItemUpholsteryField
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
                requirementState={
                  (entry.activeRequirement?.state as
                    | import("@/features/items/types").ItemUpholsteryRequirementState
                    | null
                    | undefined) ?? null
                }
                testId={`upholstery-field-${entry.client_id}`}
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
