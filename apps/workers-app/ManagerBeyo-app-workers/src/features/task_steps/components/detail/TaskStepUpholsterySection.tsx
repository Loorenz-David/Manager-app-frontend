import { useMemo } from "react";
import {
  DashedInfoSection,
  ImagePlaceholder,
  SectionLabel,
  StatePill,
} from "@beyo/ui";
import {
  useItemUpholsteryQuery,
  type ItemUpholsteryEntry,
  type UpholsteryRequirementEntry,
} from "@beyo/tasks";
import {
  formatUpholsteryRequirementLabel,
  getUpholsteryRequirementVariant,
} from "@beyo/upholstery";
import { useTaskStepDetailContext } from "../../providers/TaskStepDetailProvider";

type JoinedEntry = ItemUpholsteryEntry & {
  activeRequirement: UpholsteryRequirementEntry | null;
};

function UpholsteryEntryCard({
  entry,
}: {
  entry: JoinedEntry;
}): React.JSX.Element {
  const requirementVariant = getUpholsteryRequirementVariant(
    entry.activeRequirement?.state ?? null,
  );
  const amountMeters =
    entry.activeRequirement?.amount_meters ?? entry.amount_meters;
  const amountLabel =
    amountMeters === null ? "Quantity missing" : `${amountMeters} m`;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
      data-testid={`upholstery-entry-card-${entry.client_id}`}
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {entry.image_url ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={entry.image_url}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-4 text-muted-foreground/60" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {entry.name ?? "Upholstery unavailable"}
          </p>
          {requirementVariant && entry.activeRequirement ? (
            <StatePill
              label={formatUpholsteryRequirementLabel(
                entry.activeRequirement.state,
              )}
              variant={requirementVariant}
            />
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {entry.code ? `${entry.code} · ` : ""}
          {amountLabel}
        </p>
      </div>
    </div>
  );
}

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

  const entries = useMemo<JoinedEntry[]>(
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
