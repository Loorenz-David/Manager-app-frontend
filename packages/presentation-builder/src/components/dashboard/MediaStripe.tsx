import { cn } from "@beyo/lib";

/** The design's media placeholder: 135° stripes over #474d56. */
export function MediaStripe({ className }: { className?: string }): React.JSX.Element {
  return (
    <div
      aria-hidden
      className={cn("h-full w-full", className)}
      style={{
        background:
          "repeating-linear-gradient(135deg, #474d56 0 11px, #414751 11px 22px)",
      }}
    />
  );
}
