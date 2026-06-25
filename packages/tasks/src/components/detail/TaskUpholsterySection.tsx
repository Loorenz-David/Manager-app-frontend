import { useMemo } from "react";
import { Pencil } from "lucide-react";

import { DashedInfoSection, SectionLabel } from "@beyo/ui";

import {
  useItemUpholsteryQuery,
} from "../../api/use-item-upholstery-query";
import type {
  ItemUpholsteryEntry,
  UpholsteryRequirementEntry,
} from "../../types";

type ActiveUpholsteryEntry = ItemUpholsteryEntry & {
  activeRequirement: UpholsteryRequirementEntry | null;
};

type UpholsteryFieldRenderInput = {
  disabled: boolean;
  onChange: (newUpholsteryId: string) => void;
  requirementState: string | null;
  testId: string;
  value: string | null;
};

type TaskUpholsterySectionProps = {
  createPending?: boolean;
  itemId: string | null;
  onCreate: (newUpholsteryId: string) => void;
  onEditAmount: (itemUpholsteryId: string) => void;
  onUpdate: (itemUpholsteryId: string, newUpholsteryId: string) => void;
  renderUpholsteryField: (
    input: UpholsteryFieldRenderInput,
  ) => React.ReactNode;
  updatePending?: boolean;
};

export function TaskUpholsterySection({
  createPending = false,
  itemId,
  onCreate,
  onEditAmount,
  onUpdate,
  renderUpholsteryField,
  updatePending = false,
}: TaskUpholsterySectionProps): React.JSX.Element | null {
  const upholsteryQuery = useItemUpholsteryQuery(itemId);

  const requirementsById = useMemo(() => {
    const entries = upholsteryQuery.data?.requirements ?? [];
    return new Map<string, UpholsteryRequirementEntry>(
      entries.map((entry) => [entry.client_id, entry]),
    );
  }, [upholsteryQuery.data?.requirements]);

  const activeUpholstery = useMemo<ActiveUpholsteryEntry[]>(
    () =>
      (upholsteryQuery.data?.upholstery ?? []).map((entry) => ({
        ...entry,
        activeRequirement: entry.active_requirement_id
          ? (requirementsById.get(entry.active_requirement_id) ?? null)
          : null,
      })),
    [requirementsById, upholsteryQuery.data?.upholstery],
  );

  if (!itemId) {
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
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            No upholstery linked yet.
          </p>
          {renderUpholsteryField({
            disabled: createPending,
            onChange: onCreate,
            requirementState: null,
            testId: "upholstery-field-empty",
            value: null,
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeUpholstery.map((entry) => (
            <div key={entry.client_id} className="flex flex-col gap-3">
              {renderUpholsteryField({
                disabled:
                  entry.activeRequirement?.state === "completed" || updatePending,
                onChange: (newUpholsteryId) => {
                  if (newUpholsteryId === entry.upholstery_id) {
                    return;
                  }

                  onUpdate(entry.client_id, newUpholsteryId);
                },
                requirementState: entry.activeRequirement?.state ?? null,
                testId: `upholstery-field-${entry.client_id}`,
                value: entry.upholstery_id,
              })}
              <div className="flex items-center justify-between gap-3 px-2 text-sm">
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
                  onClick={() => onEditAmount(entry.client_id)}
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
