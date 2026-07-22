import { Search } from "lucide-react";

type DashboardTopBarProps = {
  /** Workspace display name; its first letter fills the square avatar. */
  workspaceName: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Shown inside the round user avatar when no image is available, e.g. "MK". */
  userInitials: string;
  userAvatarUrl?: string | null;
};

export function DashboardTopBar({
  workspaceName,
  searchValue,
  onSearchChange,
  userInitials,
  userAvatarUrl,
}: DashboardTopBarProps): React.JSX.Element {
  return (
    <header
      data-testid="presentation-dashboard-top-bar"
      className="flex h-[60px] items-center justify-between gap-4 border-b border-[#ececec] bg-white px-5"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-[#303030] text-[13px] font-bold text-white"
        >
          {workspaceName.charAt(0).toUpperCase()}
        </span>
        <h1 className="truncate text-[15px] font-bold text-[#303030]">
          Announcements
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#9a9a9a]"
            strokeWidth={2}
          />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search announcements"
            data-testid="presentation-dashboard-search-input"
            className="h-9 w-[200px] rounded-lg border border-[#e7e7e7] bg-[#f4f4f4] pl-8 pr-3 text-[13px] text-[#303030] placeholder:text-[#9a9a9a] focus:border-[#cdcdcd] focus:outline-none md:w-[260px]"
          />
        </div>
        <span className="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e0e0e0]">
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-[11px] font-semibold text-[#767676]">
              {userInitials}
            </span>
          )}
        </span>
      </div>
    </header>
  );
}
