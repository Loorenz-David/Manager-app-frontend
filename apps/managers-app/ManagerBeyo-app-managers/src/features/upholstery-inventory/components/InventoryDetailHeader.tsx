import { ImagePlaceholder, StatePill } from "@/components/primitives";

import { useInventoryDetailContext } from "../providers/InventoryDetailProvider";

export function InventoryDetailHeader(): React.JSX.Element | null {
  const { detail, openDetailActions } = useInventoryDetailContext();

  if (!detail) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {detail.imageUrl ? (
        <img
          alt=""
          className="size-12 shrink-0 rounded-full object-cover"
          decoding="async"
          draggable={false}
          loading="lazy"
          src={detail.imageUrl}
        />
      ) : (
        <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">
          <ImagePlaceholder iconClassName="size-5 text-muted-foreground/60" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-md font-semibold text-foreground">
            {detail.name}
          </span>
          <StatePill
            label={detail.condition.label}
            variant={detail.condition.variant}
          />
          <button
            aria-label="Inventory actions"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            type="button"
            onClick={openDetailActions}
          >
            <span className="flex flex-col items-center gap-0.5">
              {[0, 1, 2].map((index) => (
                <span key={index} className="size-1 rounded-full bg-current" />
              ))}
            </span>
          </button>
        </div>
        <span className="truncate text-sm text-muted-foreground">
          {detail.code}
        </span>
      </div>
    </div>
  );
}
