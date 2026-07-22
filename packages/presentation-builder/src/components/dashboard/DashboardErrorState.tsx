import { CircleAlert } from "lucide-react";

type DashboardErrorStateProps = {
  message?: string;
  onRetry: () => void;
};

export function DashboardErrorState({
  message = "Announcements could not be loaded.",
  onRetry,
}: DashboardErrorStateProps): React.JSX.Element {
  return (
    <div
      data-testid="presentation-dashboard-error-state"
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[#e7e7e7] bg-white px-6 py-16 text-center"
    >
      <CircleAlert aria-hidden className="mb-2 size-7 text-[#c05a5a]" strokeWidth={1.5} />
      <p className="text-[14.5px] font-bold text-[#303030]">Something went wrong</p>
      <p className="max-w-sm text-xs text-[#9a9a9a]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        data-testid="presentation-dashboard-error-retry-button"
        className="mt-3 rounded-lg border border-[#dcdcdc] bg-white px-4 py-[9px] text-[13px] font-semibold text-[#303030] transition-colors duration-150 hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]"
      >
        Try again
      </button>
    </div>
  );
}
