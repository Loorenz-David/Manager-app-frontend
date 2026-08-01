import { memo } from "react";
import { Avatar, BackendImage, ImagePlaceholder } from "@beyo/ui";
import type { WorkingSectionViewModel } from "../types";

const MAX_VISIBLE_MEMBERS = 3;

type OtherWorkingSectionCardProps = {
  section: WorkingSectionViewModel;
  onTap: (section: WorkingSectionViewModel) => void;
};

/**
 * A section the worker is not assigned to. Same shell as
 * {@link WorkingSectionCard} minus the count pills — those totals belong to the
 * caller, and on a section they are not in they would be meaningless. The
 * members of the section are shown instead, so the worker can tell whose area
 * they are stepping into.
 */
export const OtherWorkingSectionCard = memo(function OtherWorkingSectionCard({
  section,
  onTap,
}: OtherWorkingSectionCardProps): React.JSX.Element {
  const visibleMembers = section.members.slice(0, MAX_VISIBLE_MEMBERS);
  const overflowCount = section.members.length - visibleMembers.length;

  return (
    <div
      className="mx-4 flex cursor-pointer items-center overflow-hidden rounded-xl bg-card shadow-sm pl-2"
      data-testid={`other-working-section-card-${section.sectionId}`}
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
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden">
        <BackendImage
          className="size-full object-cover"
          fallback={
            <ImagePlaceholder iconClassName="size-5 text-muted-foreground/60" />
          }
          src={section.imageUrl}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-3">
        <span className="truncate text-sm font-semibold text-foreground">
          {section.name}
        </span>

        {visibleMembers.length > 0 ? (
          <div
            className="flex items-center"
            data-testid={`other-working-section-card-members-${section.sectionId}`}
          >
            <div className="flex -space-x-2">
              {visibleMembers.map((member) => (
                <Avatar
                  key={member.userId}
                  className="size-7 border-2 border-card text-[10px] bg-muted"
                  imageSrc={member.profilePictureUrl}
                  name={member.username}
                />
              ))}
            </div>
            {overflowCount > 0 ? (
              <span
                className="ml-2 text-xs font-medium text-muted-foreground"
                data-testid={`other-working-section-card-members-overflow-${section.sectionId}`}
              >
                +{overflowCount}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No members</span>
        )}
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
