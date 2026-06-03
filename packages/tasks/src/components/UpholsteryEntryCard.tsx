import { ImagePlaceholder, StatePill } from "@beyo/ui";
import {
  formatUpholsteryRequirementLabel,
  getUpholsteryRequirementVariant,
} from "@beyo/upholstery";
import type { ItemUpholsteryEntry, UpholsteryRequirementEntry } from "../types";

export type UpholsteryCardEntry = ItemUpholsteryEntry & {
  activeRequirement: UpholsteryRequirementEntry | null;
};

export function UpholsteryEntryCard({
  entry,
}: {
  entry: UpholsteryCardEntry;
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
