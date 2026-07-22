import { Megaphone } from "lucide-react";
import type { ReactNode } from "react";

type DashboardEmptyStateProps = {
  title: string;
  description?: string;
  /** Optional call-to-action, e.g. a "New announcement" button on the empty "All" filter. */
  action?: ReactNode;
};

export function DashboardEmptyState({
  title,
  description,
  action,
}: DashboardEmptyStateProps): React.JSX.Element {
  return (
    <div
      data-testid="presentation-dashboard-empty-state"
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[#e7e7e7] bg-white px-6 py-16 text-center"
    >
      <Megaphone aria-hidden className="mb-2 size-7 text-[#cdcdcd]" strokeWidth={1.5} />
      <p className="text-[14.5px] font-bold text-[#303030]">{title}</p>
      {description && <p className="max-w-sm text-xs text-[#9a9a9a]">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
