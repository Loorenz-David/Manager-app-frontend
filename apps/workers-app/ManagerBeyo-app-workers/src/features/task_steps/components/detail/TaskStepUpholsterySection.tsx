import { z } from "zod";
import { DashedInfoSection, ImagePlaceholder, SectionLabel } from "@beyo/ui";
import { useUpholsteryQuery } from "@/features/upholstery";
import { UpholsteryRequirementSchema } from "../../types";
import { useTaskStepDetailContext } from "../../providers/TaskStepDetailProvider";

type UpholsteryRequirement = z.infer<typeof UpholsteryRequirementSchema>;

function UpholsteryEntryCard({
  requirement,
}: {
  requirement: UpholsteryRequirement;
}): React.JSX.Element | null {
  const query = useUpholsteryQuery(requirement.item_upholstery_id);

  if (query.isPending) {
    return <div className="h-16 animate-pulse rounded-xl bg-muted" />;
  }

  if (query.isError || !query.data) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
      data-testid={`upholstery-entry-card-${requirement.client_id}`}
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {query.data.image_url ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={query.data.image_url}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-4 text-muted-foreground/60" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {query.data.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {query.data.code ? `Code ${query.data.code} · ` : ""}
          {requirement.amount_meters} m
        </p>
      </div>
    </div>
  );
}

export function TaskStepUpholsterySection(): React.JSX.Element | null {
  const { step } = useTaskStepDetailContext();

  if (!step?.item) {
    return null;
  }

  const requirements = step.item.upholstery_requirement;

  return (
    <DashedInfoSection
      className="mt-4 py-4"
      data-testid="task-step-upholstery-section"
    >
      <SectionLabel as="h3" tone="muted">
        Selected Upholstery
      </SectionLabel>

      {requirements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upholstery linked.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
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
