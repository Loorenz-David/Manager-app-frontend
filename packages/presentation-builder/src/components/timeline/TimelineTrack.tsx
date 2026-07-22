import type { ReactNode } from "react";

import { cn } from "@beyo/lib";

import { TIMELINE_LABEL_GUTTER_PX } from "./types";

type TimelineTrackProps = {
  /** Label gutter text — the element's text preview (or media name). */
  label: string;
  isSelected: boolean;
  onSelectLabel: () => void;
  /** The track's bar (a TimelineBar), positioned inside the lane. */
  children: ReactNode;
  testId: string;
};

/** One element row: 120px label gutter + flexible lane. */
export function TimelineTrack({
  label,
  isSelected,
  onSelectLabel,
  children,
  testId,
}: TimelineTrackProps): React.JSX.Element {
  return (
    <div className="flex h-9 items-center gap-2" data-testid={testId}>
      <button
        type="button"
        onClick={onSelectLabel}
        data-testid={`${testId}-label`}
        style={{ width: TIMELINE_LABEL_GUTTER_PX - 8 }}
        className={cn(
          "shrink-0 truncate rounded px-1 py-0.5 text-left text-xs transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#3f78a8]",
          isSelected ? "font-bold text-[#3f78a8]" : "text-[#767676] hover:text-[#303030]",
        )}
      >
        {label}
      </button>
      <div className="relative h-full min-w-0 flex-1 overflow-hidden rounded-[7px] bg-[#f6f6f6]">
        {children}
      </div>
    </div>
  );
}
