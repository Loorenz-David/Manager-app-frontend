import { useEffect, useRef } from "react";
import { PullToRefresh } from "@beyo/ui";
import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";
import { useWorkingSectionsHomeContext } from "../providers/WorkingSectionsHomeProvider";
import { OtherWorkingSectionsList } from "./OtherWorkingSectionsList";
import { WorkingSectionCard } from "./WorkingSectionCard";
import type { WorkingSectionViewModel } from "../types";

type WorkingSectionsHomeViewProps = {
  onSelectSection: (section: WorkingSectionViewModel) => void;
  /**
   * Rendered inside the scroll container, above the section list. The home
   * feature passes its top cards here; the "My Sections" heading travels with
   * them so it scrolls together with the rest of the pane.
   */
  topContent?: React.ReactNode;
};

export function WorkingSectionsHomeView({
  onSelectSection,
  topContent,
}: WorkingSectionsHomeViewProps): React.JSX.Element {
  const { sections, isPending, isError, refetch } =
    useWorkingSectionsHomeContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const registerScrollElement = useRegisterScrollElement();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return registerScrollElement(el);
  }, [registerScrollElement]);

  return (
    <div
      className="flex h-full flex-col"
      data-testid="working-sections-home-view"
    >
      <PullToRefresh
        className="flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={refetch}
      >
        <div className="pt-4">{topContent}</div>

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

        {isPending || isError ? null : (
          <div className="pb-2 pt-1">
            <OtherWorkingSectionsList onSelectSection={onSelectSection} />
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}
