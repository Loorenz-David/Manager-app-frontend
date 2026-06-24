import { cva } from "class-variance-authority";
import { GripVertical, Heart } from "lucide-react";

import { ImagePlaceholder } from "@beyo/ui";
import { cn } from "@beyo/lib";

import { formatMeters, type UpholsteryPickerRecord } from "../types";

const upholsteryCardVariants = cva(
  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  {
    variants: {
      selected: {
        true: "border-primary bg-primary text-card",
        false: "border-border bg-card text-foreground",
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
);

type UpholsteryCardProps = {
  record: UpholsteryPickerRecord;
  isSelected: boolean;
  onSelect: (clientId: string) => void;
  onToggleFavorite?: (clientId: string, currentFavorite: boolean) => void;
  onOpenReorder?: (clientId: string) => void;
  testId?: string;
};

export function UpholsteryCard({
  record,
  isSelected,
  onSelect,
  onToggleFavorite,
  onOpenReorder,
  testId,
}: UpholsteryCardProps): React.JSX.Element {
  const conditionColors = {
    available: "bg-emerald-500",
    low_stock: "bg-amber-500",
    out_of_stock: "bg-rose-500",
  } as const;
  const conditionColor = record.inventory_condition
    ? conditionColors[record.inventory_condition]
    : null;

  return (
    <div
      data-testid={testId}
      className={upholsteryCardVariants({ selected: isSelected })}
    >
      <button
        aria-label={record.name}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        type="button"
        onClick={() => onSelect(record.client_id)}
      >
        {record.image_url ? (
          <img
            src={record.image_url}
            alt={record.name}
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="size-10 shrink-0 overflow-hidden rounded-full">
            <ImagePlaceholder />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-medium",
              isSelected ? "text-card" : "text-foreground",
            )}
          >
            {record.name}
          </p>
          {record.code !== null ? (
            <p
              className={cn(
                "truncate text-xs",
                isSelected ? "text-card/70" : "text-muted-foreground",
              )}
            >
              {record.code}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-2 text-sm font-medium tabular-nums",
            isSelected ? "text-card/80" : "text-muted-foreground",
          )}
        >
          {conditionColor ? (
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", conditionColor)}
            />
          ) : null}
          {formatMeters(record.current_stored_amount_meters) ?? "—"}
        </span>
      </button>

      {onOpenReorder || onToggleFavorite ? (
        <div className="flex shrink-0 items-center gap-1">
          {onOpenReorder ? (
            <button
              aria-label={`Reorder ${record.name}`}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg transition-colors duration-150",
                isSelected
                  ? "text-card/80 hover:bg-white/10"
                  : "text-muted-foreground hover:bg-muted",
              )}
              data-testid="upholstery-card-reorder-button"
              type="button"
              onClick={() => onOpenReorder(record.client_id)}
            >
              <GripVertical aria-hidden="true" className="size-4" />
            </button>
          ) : null}

          {onToggleFavorite ? (
            <button
              aria-label={`${record.favorite ? "Remove" : "Add"} ${record.name} favorite`}
              aria-pressed={record.favorite}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg transition-colors duration-150",
                record.favorite
                  ? "text-rose-500 hover:bg-rose-500/10"
                  : isSelected
                    ? "text-card/80 hover:bg-white/10"
                    : "text-muted-foreground hover:bg-muted",
              )}
              data-testid="upholstery-card-favorite-button"
              type="button"
              onClick={() => onToggleFavorite(record.client_id, record.favorite)}
            >
              <Heart
                aria-hidden="true"
                className="size-4"
                fill={record.favorite ? "currentColor" : "none"}
              />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
