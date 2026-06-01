import { TaskIssuesSection } from "@beyo/tasks";
import type { ItemCategoryViewModel } from "@beyo/item-categories";
import {
  DashedInfoGroup,
  DashedInfoSection,
  EyebrowLabel,
  InfoPill,
} from "@beyo/ui";
import { useTaskStepDetailContext } from "../../providers/TaskStepDetailProvider";

function ItemCategoryPill({
  category,
  isPending,
  isError,
}: {
  category: ItemCategoryViewModel | null;
  isPending: boolean;
  isError: boolean;
}): React.JSX.Element | null {
  if (isError) {
    return null;
  }

  if (isPending) {
    return (
      <InfoPill className="animate-pulse text-transparent" aria-hidden="true">
        ···
      </InfoPill>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <InfoPill data-testid="task-step-item-category-pill">
      {category.imageUrl ? (
        <img
          alt=""
          className="mr-1.5 size-4 rounded-full object-cover"
          decoding="async"
          draggable={false}
          loading="lazy"
          src={category.imageUrl}
        />
      ) : null}
      <span className="text-sm">{category.name}</span>
    </InfoPill>
  );
}

export function TaskStepItemDetailsSection(): React.JSX.Element | null {
  const {
    step,
    itemCategory,
    isItemCategoryPending,
    isItemCategoryError,
    isSeatCategory,
    issuesSurfaceOpeners,
  } = useTaskStepDetailContext();

  if (!step?.item) {
    return null;
  }

  const hasPosition = Boolean(step.item.item_position);
  const hasCategory = Boolean(step.item.item_category_id);
  const shouldRenderQuantity = isSeatCategory;
  const shouldRenderDetails =
    hasPosition || shouldRenderQuantity || hasCategory;

  if (!shouldRenderDetails) {
    return (
      <TaskIssuesSection
        itemId={step.item.client_id}
        surfaceOpeners={issuesSurfaceOpeners}
        data-testid="task-step-item-issues-section"
      />
    );
  }

  return (
    <DashedInfoGroup data-testid="task-step-item-details">
      <DashedInfoSection className="px-3 py-3">
        <div className="flex items-start gap-4 overflow-x-auto">
          {hasPosition ? (
            <div className="flex shrink-0 flex-col gap-1">
              <EyebrowLabel>Position</EyebrowLabel>
              <InfoPill>
                <span className="text-sm">{step.item.item_position}</span>
              </InfoPill>
            </div>
          ) : null}

          {shouldRenderQuantity ? (
            <div className="flex shrink-0 flex-col gap-1">
              <EyebrowLabel>Quantity</EyebrowLabel>
              <InfoPill data-testid="task-step-item-qty-pill">
                <span className="text-sm">
                  {step.item.quantity} piece{step.item.quantity > 1 ? "s" : ""}
                </span>
              </InfoPill>
            </div>
          ) : null}

          {hasCategory ? (
            <div className="flex min-w-0 shrink-0 flex-col gap-1">
              <EyebrowLabel>Category</EyebrowLabel>
              <div className="min-w-0">
                <ItemCategoryPill
                  category={itemCategory}
                  isPending={isItemCategoryPending}
                  isError={isItemCategoryError}
                />
              </div>
            </div>
          ) : null}
        </div>
      </DashedInfoSection>

      <TaskIssuesSection
        itemId={step.item.client_id}
        surfaceOpeners={issuesSurfaceOpeners}
        data-testid="task-step-item-issues-section"
      />
    </DashedInfoGroup>
  );
}
