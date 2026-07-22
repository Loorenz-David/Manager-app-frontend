import type { ReactNode } from "react";

/** Responsive card grid: 1 column narrow, 2 medium, 3 wide; 18px gaps per design. */
export function AnnouncementCardGrid({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  );
}
