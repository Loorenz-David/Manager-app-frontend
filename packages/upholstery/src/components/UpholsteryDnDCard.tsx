import type { ButtonHTMLAttributes, Ref } from "react";
import { GripVertical } from "lucide-react";

import { ImagePlaceholder } from "@beyo/ui";
import { cn } from "@beyo/lib";

import { getUpholsteryImageUrl } from "../image-url";
import { formatMeters, type UpholsteryPickerRecord } from "../types";

type UpholsteryDnDCardProps = {
  record: UpholsteryPickerRecord;
  displayOrder: number;
  isDragOverlay?: boolean;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: Ref<HTMLButtonElement>;
};

export function UpholsteryDnDCard({
  record,
  displayOrder,
  isDragOverlay = false,
  dragHandleProps,
  dragHandleRef,
}: UpholsteryDnDCardProps): React.JSX.Element {
  const thumbnailUrl = getUpholsteryImageUrl(record.image_url, {
    width: 64,
    height: 64,
    fillCanvas: true
  });
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3",
        isDragOverlay && "shadow-2xl opacity-90",
      )}
      data-testid={`upholstery-dnd-card-${record.client_id}`}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
        {displayOrder}
      </div>

      {thumbnailUrl ? (
        <img
          alt={record.name}
          className="size-10 shrink-0 rounded-full bg-muted object-contain"
          decoding="async"
          loading="lazy"
          src={thumbnailUrl}
        />
      ) : (
        <div className="size-10 shrink-0 overflow-hidden rounded-full">
          <ImagePlaceholder />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{record.name}</p>
        {record.code ? (
          <p className="truncate text-xs text-muted-foreground">{record.code}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="tabular-nums">{formatMeters(record.current_stored_amount_meters) ?? "—"}</span>
        <button
          aria-label={`Reorder ${record.name}`}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground",
            "touch-none cursor-grab transition-colors duration-150 active:cursor-grabbing hover:bg-muted",
            isDragOverlay && "pointer-events-none",
          )}
          data-testid={`upholstery-dnd-handle-${record.client_id}`}
          ref={dragHandleRef}
          type="button"
          {...dragHandleProps}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
