import { Avatar } from "@beyo/ui";

export type TimelineCalendarHeaderProps = {
  username: string;
  profilePicture: string | null;
  dateLabel: string;
  isBackgroundLoading: boolean;
  onOpenDatePicker: () => void;
};

// Compact slide-page header: worker identity left, tappable date pill right.
// Date navigation is the horizontal pager (drag) + the pill's picker — no
// arrow buttons.
export function TimelineCalendarHeader({
  username,
  profilePicture,
  dateLabel,
  isBackgroundLoading,
  onOpenDatePicker,
}: TimelineCalendarHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
      <Avatar
        className="size-10 text-xs bg-light-border shadow-sm border-light-border"
        imageSrc={profilePicture}
        name={username}
      />
      <h1 className="min-w-0 flex-1 truncate text-md font-semibold tracking-tight text-foreground">
        {username}
      </h1>

      {isBackgroundLoading ? (
        <span
          aria-label="Updating timeline"
          className="size-2 shrink-0 animate-pulse rounded-full bg-primary"
          data-testid="timeline-background-loading"
          role="status"
        />
      ) : null}

      <button
        aria-label="Select timeline date"
        className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm"
        data-testid="timeline-date-pill"
        type="button"
        onClick={onOpenDatePicker}
      >
        {dateLabel}
      </button>
    </div>
  );
}
