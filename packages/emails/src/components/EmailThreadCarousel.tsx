import { cn, durations, easings } from "@beyo/lib";

type EmailThreadCarouselProps = {
  activeIndex: 0 | 1;
  inboxPane: React.ReactNode;
  threadPane: React.ReactNode;
};

export function EmailThreadCarousel({
  activeIndex,
  inboxPane,
  threadPane,
}: EmailThreadCarouselProps): React.JSX.Element {
  return (
    <div className="h-full overflow-hidden">
      <div
        className={cn("flex h-full w-[200%]")}
        style={{
          transform: `translateX(${activeIndex * -50}%)`,
          transition: `transform ${durations.slide}s cubic-bezier(${easings.slideIn.join(",")})`,
        }}
      >
        <div className="flex h-full w-1/2 flex-col">{inboxPane}</div>
        <div className="flex h-full w-1/2 flex-col">{threadPane}</div>
      </div>
    </div>
  );
}
