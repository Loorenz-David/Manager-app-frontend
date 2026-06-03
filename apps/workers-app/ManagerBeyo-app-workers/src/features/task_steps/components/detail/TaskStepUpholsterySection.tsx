import { useMemo } from "react";
import { DashedInfoSection, SectionLabel } from "@beyo/ui";
import {
  UpholsteryEntryCard,
  useItemUpholsteryQuery,
  type UpholsteryCardEntry,
  type UpholsteryRequirementEntry,
} from "@beyo/tasks";
import { useTaskStepDetailContext } from "../../providers/TaskStepDetailProvider";

export function TaskStepUpholsterySection(): React.JSX.Element | null {
  const { step, isSeatCategory } = useTaskStepDetailContext();
  const itemId = step?.item?.client_id ?? null;
  const upholsteryQuery = useItemUpholsteryQuery(itemId);

  const requirementsById = useMemo(() => {
    const entries = upholsteryQuery.data?.requirements ?? [];
    return new Map<string, UpholsteryRequirementEntry>(
      entries.map((entry) => [entry.client_id, entry]),
    );
  }, [upholsteryQuery.data?.requirements]);

  const entries = useMemo<UpholsteryCardEntry[]>(
    () =>
      (upholsteryQuery.data?.upholstery ?? [])
        .map((entry) => ({
          ...entry,
          activeRequirement: entry.active_requirement_id
            ? (requirementsById.get(entry.active_requirement_id) ?? null)
            : null,
        }))
        .filter((entry) => entry.activeRequirement?.state !== "failed"),
    [requirementsById, upholsteryQuery.data?.upholstery],
  );

  if (!step?.item || !isSeatCategory) {
    return null;
  }

  return (
    <DashedInfoSection className=" " data-testid="task-step-upholstery-section">
      <SectionLabel as="h3" tone="muted">
        Selected Upholstery
      </SectionLabel>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upholstery linked.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <UpholsteryEntryCard key={entry.client_id} entry={entry} />
          ))}
        </div>
      )}
    </DashedInfoSection>
  );
}
