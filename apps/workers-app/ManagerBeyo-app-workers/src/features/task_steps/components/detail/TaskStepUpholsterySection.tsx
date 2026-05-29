import { z } from "zod";
import {
  DashedInfoSection,
  ImagePlaceholder,
  SectionLabel,
  StatePill,
} from "@beyo/ui";
import {
  formatUpholsteryRequirementLabel,
  getUpholsteryRequirementVariant,
} from "@beyo/upholstery";
import { useUpholsteryQuery } from "@/features/upholstery";
import { UpholsteryRequirementSchema } from "../../types";
import { useTaskStepDetailContext } from "../../providers/TaskStepDetailProvider";

type UpholsteryRequirement = z.infer<typeof UpholsteryRequirementSchema>;

function UpholsteryEntryCard({
  requirement,
}: {
  requirement: UpholsteryRequirement;
}): React.JSX.Element | null {
  const upholsteryClientId =
    requirement.upholstery_id ?? requirement.item_upholstery_id ?? null;

  const query = useUpholsteryQuery(upholsteryClientId);
  const requirementVariant = getUpholsteryRequirementVariant(requirement.state);
  const isFetchingUpholstery = Boolean(upholsteryClientId) && query.isPending;

  if (isFetchingUpholstery) {
    return <div className="h-16 animate-pulse rounded-xl bg-muted" />;
  }

  const upholsteryName = query.data?.name ?? "Upholstery unavailable";
  const upholsteryCode = query.data?.code ?? null;
  const upholsteryImageUrl = query.data?.image_url ?? null;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
      data-testid={`upholstery-entry-card-${requirement.client_id}`}
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {upholsteryImageUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={upholsteryImageUrl}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-4 text-muted-foreground/60" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {upholsteryName}
          </p>
          {requirementVariant ? (
            <StatePill
              label={formatUpholsteryRequirementLabel(requirement.state)}
              variant={requirementVariant}
            />
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {upholsteryCode ? `${upholsteryCode} · ` : ""}
          {requirement.amount_meters} m
        </p>
      </div>
    </div>
  );
}

export function TaskStepUpholsterySection(): React.JSX.Element | null {
  const { step, isSeatCategory } = useTaskStepDetailContext();

  if (!step?.item || !isSeatCategory) {
    return null;
  }

  const requirements = step.item.upholstery_requirement.filter(
    (requirement) => requirement.state !== "failed",
  );

  return (
    <DashedInfoSection className=" " data-testid="task-step-upholstery-section">
      <SectionLabel as="h3" tone="muted">
        Selected Upholstery
      </SectionLabel>

      {requirements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upholstery linked.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {requirements.map((requirement) => (
            <UpholsteryEntryCard
              key={requirement.client_id}
              requirement={requirement}
            />
          ))}
        </div>
      )}
    </DashedInfoSection>
  );
}
