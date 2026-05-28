import { AnimatePresence, m } from 'framer-motion';
import { ArrowUpDown, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { forwardRef } from 'react';

import { transitions } from '@beyo/lib';
import { cn } from '@beyo/lib';

import { DISABLED_BASE, FOCUS_WITHIN_RING } from '../shared';
import { SEARCH_BAR_WRAPPER, searchBarActionButtonVariants } from './search-bar.variants';
import type { SearchBarProps } from './search-bar.types';

function FilterCountBadge({ count }: { count: number }): React.JSX.Element {
  return (
    <m.span
      animate={{ opacity: 1, scale: 1 }}
      // text-[10px] is intentional: no token exists for this compact badge size.
      className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-card"
      exit={{ opacity: 0, scale: 0.7 }}
      initial={{ opacity: 0, scale: 0.7 }}
      transition={transitions.fast}
    >
      {count > 99 ? '99+' : count}
    </m.span>
  );
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      onSortPress,
      onFilterPress,
      placeholder,
      disabled = false,
      isLoading = false,
      activeFilterCount = 0,
      wrapperClassName,
      className,
      'data-testid': testId,
      ...inputProps
    },
    ref,
  ) => {
    const isFilterActive = activeFilterCount > 0;

    return (
      <div
        className={cn(SEARCH_BAR_WRAPPER, FOCUS_WITHIN_RING, DISABLED_BASE, wrapperClassName)}
        data-testid={testId}
      >
        <span className="pointer-events-none shrink-0 pl-3 text-icon">
          <Search className="size-4" />
        </span>
        <input
          ref={ref}
          {...inputProps}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent px-3 text-base text-foreground',
            'placeholder:text-border appearance-none outline-none',
            // Suppress the native WebKit clear button so it does not collide with the action area.
            'disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:appearance-none',
            className,
          )}
          data-testid={testId ? `${testId}-input` : undefined}
          disabled={disabled}
          placeholder={placeholder}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
        {isLoading ? (
          // min-w-[88px] = 2 x min-w-11 action buttons; keep in sync with button sizing.
          <span className="flex h-full min-w-[88px] shrink-0 items-center justify-center text-icon">
            <Loader2 className="size-4 animate-spin" />
          </span>
        ) : (
          <>
            <button
              aria-label="Sort"
              className={searchBarActionButtonVariants({ active: false })}
              data-testid={testId ? `${testId}-sort` : undefined}
              disabled={disabled}
              type="button"
              onClick={onSortPress}
            >
              <ArrowUpDown className="size-4" />
            </button>
            <button
              aria-label="Filter"
              className={cn(searchBarActionButtonVariants({ active: isFilterActive }), 'gap-1 pr-3')}
              data-testid={testId ? `${testId}-filter` : undefined}
              disabled={disabled}
              type="button"
              onClick={onFilterPress}
            >
              <SlidersHorizontal className="size-4" />
              <AnimatePresence initial={false}>
                {isFilterActive ? <FilterCountBadge key="badge" count={activeFilterCount} /> : null}
              </AnimatePresence>
            </button>
          </>
        )}
      </div>
    );
  },
);

SearchBar.displayName = 'SearchBar';
