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
  canHaveUpholstery: boolean | null;
  disabled: boolean;
  onCanHaveUpholsteryChange: ((next: boolean | null) => void) | undefined;
  onChange: (newUpholsteryId: string | null) => void;
  requirementState: string | null;
  testId: string;
  value: string | null;
};

type TaskUpholsterySectionProps = {
  /**
   * The item's `can_have_upholstery` flag; `null` when never recorded.
   */
  canHaveUpholstery?: boolean | null;
  createPending?: boolean;
  itemId: string | null;
  onCanHaveUpholsteryChange?: (next: boolean | null) => void;
  onCreate: (newUpholsteryId: string) => void;
  onEditAmount: (itemUpholsteryId: string) => void;
  /** Removes the link entirely — the way back to "no upholstery chosen". */
  onRemove?: (itemUpholsteryId: string) => void;
  onUpdate: (itemUpholsteryId: string, newUpholsteryId: string) => void;
  renderUpholsteryField: (
    input: UpholsteryFieldRenderInput,
  ) => React.ReactNode;
  updatePending?: boolean;
};

export function TaskUpholsterySection({
  canHaveUpholstery = null,
  createPending = false,
  itemId,
  onCanHaveUpholsteryChange,
  onCreate,
  onEditAmount,
  onRemove,
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
          {canHaveUpholstery === false ? null : (
            <p className="text-sm text-muted-foreground">
              No upholstery linked yet.
            </p>
          )}
          {renderUpholsteryField({
            canHaveUpholstery,
            disabled: createPending,
            onCanHaveUpholsteryChange,
            onChange: (newUpholsteryId) => {
              // Nothing is linked, so a cleared selection is already the state.
              if (newUpholsteryId === null) {
                return;
              }

              onCreate(newUpholsteryId);
            },
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
                // A linked upholstery outranks the flag, so the None segment is
                // never offered here — the user removes the link first.
                canHaveUpholstery,
                disabled:
                  entry.activeRequirement?.state === "completed" || updatePending,
                onCanHaveUpholsteryChange,
                onChange: (newUpholsteryId) => {
                  if (newUpholsteryId === null) {
                    onRemove?.(entry.client_id);
                    return;
                  }

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
