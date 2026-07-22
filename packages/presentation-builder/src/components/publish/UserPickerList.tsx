import { Check, Search } from "lucide-react";

import { cn } from "@beyo/lib";

export type UserPickerOption = {
  id: string;
  /** Display name, e.g. username. */
  label: string;
  /** Secondary line (role, email); optional. */
  sublabel?: string | null;
};

type UserPickerListProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  options: UserPickerOption[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  /** e.g. "Required in 'selected users only' mode." */
  hint?: string;
  emptyText?: string;
};

/** Searchable workspace-member multi-select for `user_ids` targeting. */
export function UserPickerList({
  searchValue,
  onSearchChange,
  options,
  selectedIds,
  onToggle,
  isLoading,
  disabled,
  hint,
  emptyText = "No members match.",
}: UserPickerListProps): React.JSX.Element {
  return (
    <div data-testid="presentation-publish-user-picker">
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
          disabled={disabled}
          placeholder="Search members"
          aria-label="Search workspace members"
          data-testid="presentation-publish-user-search-input"
          className="h-9 w-full rounded-lg border border-[#dcdcdc] bg-[#fafafa] pl-8 pr-3 text-[13px] text-[#303030] placeholder:text-[#9a9a9a] focus:border-[#3f78a8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="mt-2 max-h-[180px] overflow-y-auto rounded-lg border border-[#ececec]">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-4 animate-pulse rounded bg-[#f0f0f0]" />
            ))}
          </div>
        ) : options.length === 0 ? (
          <p className="p-3 text-xs text-[#9a9a9a]">{emptyText}</p>
        ) : (
          options.map((option) => {
            const isSelected = selectedIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => onToggle(option.id)}
                data-testid={`presentation-publish-user-option-${option.id}`}
                className={cn(
                  "flex w-full items-center gap-2.5 border-b border-[#f4f4f4] px-3 py-2 text-left transition-colors duration-150 last:border-b-0 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50",
                  isSelected && "bg-[rgba(63,120,168,0.07)]",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e0e0e0] text-[10px] font-semibold text-[#767676]">
                  {option.label.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[#303030]">
                    {option.label}
                  </span>
                  {option.sublabel && (
                    <span className="block truncate text-[11px] text-[#9a9a9a]">
                      {option.sublabel}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    isSelected
                      ? "border-[#3f78a8] bg-[#3f78a8] text-white"
                      : "border-[#cdcdcd] bg-white",
                  )}
                >
                  {isSelected && <Check aria-hidden className="size-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-[#9a9a9a]">{hint}</p>}
    </div>
  );
}
