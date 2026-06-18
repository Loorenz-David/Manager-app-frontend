import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { cn } from "@/lib/utils";

export function InventoryDetailFooter({
  isHidden = false,
  onEdit,
}: {
  isHidden?: boolean;
  onEdit?: () => void;
}): React.JSX.Element {
  const header = useSurfaceHeader();

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-20",
        "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isHidden ? "pointer-events-none translate-y-full" : "translate-y-0",
      )}
    >
      <div className="flex gap-3 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]">
        <button
          className="flex-1 rounded-2xl border border-between-border bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm"
          type="button"
          onClick={() => header?.requestClose()}
        >
          Close & Back
        </button>
        <button
          className="flex-1 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm"
          type="button"
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
    </div>
  );
}
