import { cn } from "@beyo/lib";

import { OptionList, type OptionListProps } from "./OptionList";

export type AnchoredOptionListProps<TValue extends string = string> =
  OptionListProps<TValue> & {
    maxVisibleOptions?: number;
  };

export function AnchoredOptionList<TValue extends string = string>({
  maxVisibleOptions = 8,
  className,
  ...props
}: AnchoredOptionListProps<TValue>): React.JSX.Element {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-border bg-card shadow-lg",
        className,
      )}
      style={{ maxHeight: `${Math.max(1, maxVisibleOptions) * 3}rem` }}
    >
      <OptionList {...props} />
    </div>
  );
}
