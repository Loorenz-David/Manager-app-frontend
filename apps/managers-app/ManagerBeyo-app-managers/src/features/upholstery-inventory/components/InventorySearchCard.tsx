import { memo } from "react";
import { Plus } from "lucide-react";

import { formatMeters, type UpholsteryPickerRecord } from "@beyo/upholstery";

import { ImagePlaceholder } from "@/components/primitives";

type InventorySearchCardProps = {
  record: UpholsteryPickerRecord;
  onTapCard: (record: UpholsteryPickerRecord) => void;
  onTapAdd: (record: UpholsteryPickerRecord) => void;
};

const conditionColors = {
  available: "bg-emerald-500",
  low_stock: "bg-amber-500",
  out_of_stock: "bg-rose-500",
} as const;

export const InventorySearchCard = memo(function InventorySearchCard({
  record,
  onTapCard,
  onTapAdd,
}: InventorySearchCardProps): React.JSX.Element {
  const conditionColor = record.inventory_condition
    ? conditionColors[record.inventory_condition]
    : null;

  return (
    <div
      className="mx-4 flex shrink-0 overflow-hidden rounded-xl bg-card shadow-sm"
      data-testid={`inventory-search-card-${record.client_id}`}
    >
      <button
        aria-label={`Open ${record.name}`}
        className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted"
        type="button"
        onClick={() => onTapCard(record)}
      >
        {record.image_url ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={record.image_url}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
        )}
      </button>

      <div
        className="flex min-w-0 flex-1 cursor-pointer flex-col justify-start px-3 py-2.5"
        role="button"
        tabIndex={0}
        onClick={() => onTapCard(record)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onTapCard(record);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 basis-0 truncate text-sm font-medium text-foreground">
            {record.name}
          </span>
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {conditionColor ? (
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${conditionColor}`}
              />
            ) : null}
            {record.inventory_condition?.replaceAll("_", " ") ?? "Unknown"}
          </span>
        </div>

        <span className="mt-2 truncate text-sm text-muted-foreground">
          {record.code ?? "No code"}
        </span>

        <div className="mt-auto flex justify-end pt-3">
          <button
            aria-label={`Add stock for ${record.name}`}
            className="flex items-stretch overflow-hidden rounded-2xl"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTapAdd(record);
            }}
          >
            <div className="flex flex-col justify-center rounded-l-2xl border-y border-l border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Stored
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatMeters(record.current_stored_amount_meters) ?? "0 m"}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-r-2xl bg-primary px-3 text-card">
              <span className="text-sm font-semibold">Add</span>
              <Plus className="size-4" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
});
