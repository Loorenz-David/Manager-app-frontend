import { Plus } from "lucide-react";

type NewAnnouncementCardProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function NewAnnouncementCard({
  onClick,
  disabled,
}: NewAnnouncementCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid="presentation-dashboard-new-announcement-card"
      className="flex min-h-[254px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#cdcdcd] bg-[#fafafa] transition-colors duration-150 hover:border-[#9a9a9a] hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Plus aria-hidden className="mb-1 size-6 text-[#9a9a9a]" strokeWidth={1.5} />
      <span className="text-[13.5px] font-semibold text-[#767676]">
        New announcement
      </span>
      <span className="text-xs text-[#9a9a9a]">Start from blank</span>
    </button>
  );
}
