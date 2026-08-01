import { useWorkingSectionsHomeContext } from "../providers/WorkingSectionsHomeProvider";
import { OtherWorkingSectionCard } from "./OtherWorkingSectionCard";
import type { WorkingSectionViewModel } from "../types";

type OtherWorkingSectionsListProps = {
  onSelectSection: (section: WorkingSectionViewModel) => void;
};

/**
 * "Show more" block under the worker's own sections: expands into every other
 * section in the workspace so they can drop into one without losing sight of
 * their own list. Tapping a card opens the same steps pane as an own section.
 */
export function OtherWorkingSectionsList({
  onSelectSection,
}: OtherWorkingSectionsListProps): React.JSX.Element {
  const { other } = useWorkingSectionsHomeContext();
  const { otherSections, isExpanded, toggleExpanded, isPending, isError } =
    other;

  return (
    <div className="flex flex-col gap-3" data-testid="other-working-sections">
      {isExpanded ? (
        isPending ? (
          <div className="flex flex-col gap-3 pt-1">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="mx-4 h-20 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : isError ? (
          <div
            className="px-4 py-2 text-center text-sm text-muted-foreground"
            data-testid="other-working-sections-error"
          >
            Could not load the other sections.
          </div>
        ) : otherSections.length === 0 ? (
          <div
            className="px-4 py-2 text-center text-sm text-muted-foreground"
            data-testid="other-working-sections-empty"
          >
            There are no other sections.
          </div>
        ) : (
          <div
            className="flex flex-col gap-3 pt-1"
            data-testid="other-working-sections-list"
          >
            {otherSections.map((section) => (
              <OtherWorkingSectionCard
                key={section.sectionId}
                section={section}
                onTap={onSelectSection}
              />
            ))}
          </div>
        )
      ) : null}

      <div className="px-4">
        <button
          className="w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold text-muted-foreground"
          data-testid="other-working-sections-toggle"
          type="button"
          onClick={toggleExpanded}
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      </div>
    </div>
  );
}
