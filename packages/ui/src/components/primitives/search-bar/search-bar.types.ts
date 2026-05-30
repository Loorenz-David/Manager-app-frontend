import type { InputHTMLAttributes } from "react";

export type SearchBarProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
  onSortPress?: () => void;
  onFilterPress?: () => void;
  showSortButton?: boolean;
  showFilterButton?: boolean;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  activeFilterCount?: number;
  wrapperClassName?: string;
  "data-testid"?: string;
};
