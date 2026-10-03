import { useEffect, useId, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@beyo/lib";

export type CollapsibleDrawerProps = {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count?: number;
  children: ReactNode;
  className?: string;
  triggerClassName?: string;
  countClassName?: string;
  contentClassName?: string;
  "data-testid"?: string;
};

export function CollapsibleDrawer({
  title,
  open,
  onOpenChange,
  count = 0,
  children,
  className,
  triggerClassName,
  countClassName,
  contentClassName,
  "data-testid": testId,
}: CollapsibleDrawerProps): React.JSX.Element {
  const contentId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && contentRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus();
    }
  }, [open]);

  return (
    <section
      className={cn("w-full border-b border-border/50 bg-transparent", className)}
      data-testid={testId}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "flex min-h-14 w-full items-center justify-between gap-3 text-left text-sm font-medium text-foreground transition-colors hover:text-foreground/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none",
          triggerClassName,
        )}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => onOpenChange(!open)}
      >
        <span className="min-w-0">{title}</span>
        <span className="flex shrink-0 items-center gap-2.5">
          {count > 0 ? (
            <span
              className={cn(
                "inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-card",
                countClassName,
              )}
              aria-label={`${count} active filters`}
              data-testid={testId ? `${testId}-count` : undefined}
            >
              {count}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </span>
      </button>
      <div
        id={contentId}
        ref={contentRef}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "pb-5 pt-1 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
              contentClassName,
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
