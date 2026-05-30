import { useRef } from "react";
import { PullToRefresh } from "@beyo/ui";
import { useWorkingSectionsHomeContext } from "../providers/WorkingSectionsHomeProvider";
import { WorkingSectionCard } from "./WorkingSectionCard";
import type { WorkingSectionViewModel } from "../types";

type WorkingSectionsHomeViewProps = {
  onSelectSection: (section: WorkingSectionViewModel) => void;
};

export function WorkingSectionsHomeView({
  onSelectSection,
}: WorkingSectionsHomeViewProps): React.JSX.Element {
  const { sections, isPending, isError, refetch } =
    useWorkingSectionsHomeContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="flex h-full flex-col"
      data-testid="working-sections-home-view"
    >
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">My Sections</h1>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Under construction
        </span>
      </header>

      <PullToRefresh
        className="flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={refetch}
      >
        {isPending ? (
          <div className="flex flex-col gap-3 px-0 py-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="mx-4 h-20 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : isError ? (
          <div
            className="px-4 py-6 text-center text-sm text-muted-foreground"
            data-testid="working-sections-error"
          >
            Could not load sections. Pull to refresh.
          </div>
        ) : sections.length === 0 ? (
          <div
            className="px-4 py-6 text-center text-sm text-muted-foreground"
            data-testid="working-sections-empty"
          >
            No working sections assigned.
          </div>
        ) : (
          <div
            className="flex flex-col gap-3 py-2"
            data-testid="working-sections-list"
          >
            {sections.map((section) => (
              <WorkingSectionCard
                key={section.sectionId}
                section={section}
                onTap={onSelectSection}
              />
            ))}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}
