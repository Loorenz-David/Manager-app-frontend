import { memo } from "react";
import { ImagePlaceholder } from "@beyo/ui";
import type { WorkingSectionViewModel } from "../types";

type WorkingSectionCardProps = {
  section: WorkingSectionViewModel;
  onTap: (section: WorkingSectionViewModel) => void;
};

export const WorkingSectionCard = memo(function WorkingSectionCard({
  section,
  onTap,
}: WorkingSectionCardProps): React.JSX.Element {
  return (
    <div
      className="mx-4 flex cursor-pointer items-center overflow-hidden rounded-xl bg-card shadow-sm pl-2"
      data-testid={`working-section-card-${section.sectionId}`}
      role="button"
      tabIndex={0}
      onClick={() => onTap(section)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTap(section);
        }
      }}
    >
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden ">
        {section.imageUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={section.imageUrl}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-5 text-muted-foreground/60" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-3">
        <span className="truncate text-sm font-semibold text-foreground">
          {section.name}
        </span>
        <div className="flex items-center gap-2">
          {section.readyAndPendingCount > 0 ? (
            <span
              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              data-testid={`working-section-card-active-count-${section.sectionId}`}
            >
              {section.readyAndPendingCount} active
            </span>
          ) : section.todayDoneCount > 0 ? (
            <span aria-hidden="true" className="invisible inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              0 active
            </span>
          ) : null}
          {section.todayDoneCount > 0 ? (
            <span
              className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"
              data-testid={`working-section-card-done-count-${section.sectionId}`}
            >
              {section.todayDoneCount} done today
            </span>
          ) : null}
        </div>
      </div>

      <div className="pr-3 text-muted-foreground">
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M9 18l6-6-6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
});
