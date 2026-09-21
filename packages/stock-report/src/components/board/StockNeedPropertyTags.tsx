import { cn } from "@beyo/lib";

export type StockNeedPropertyTagsProps = {
  /**
   * Already-formatted labels, in the order they should read. Formatting
   * criteria into tag text is the logic session's job (intention §4.1) — this
   * component neither joins values nor capitalises them.
   */
  tags: readonly string[];
  className?: string;
  "data-testid"?: string;
};

export function StockNeedPropertyTags({
  tags,
  className,
  "data-testid": testId,
}: StockNeedPropertyTagsProps): React.JSX.Element | null {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex min-w-0 flex-wrap gap-1.5", className)}
      data-testid={testId}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-md bg-soft-container px-2 py-[3px] text-xs font-medium text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
