import {
  useItemCategoryByIdFlow,
  type ItemCategoryId,
} from "@beyo/item-categories";
import { EyebrowLabel, InfoPill } from "@beyo/ui";
import { useTaskStepDetailContext } from "../../providers/TaskStepDetailProvider";

function ItemCategoryPill({
  categoryId,
}: {
  categoryId: string;
}): React.JSX.Element | null {
  const { category, isPending, isError } = useItemCategoryByIdFlow(
    categoryId as ItemCategoryId,
  );

  if (isError) {
    return null;
  }

  if (isPending || !category) {
    return (
      <InfoPill className="animate-pulse text-transparent" aria-hidden="true">
        ···
      </InfoPill>
    );
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
  const { step } = useTaskStepDetailContext();

  if (!step?.item) {
    return null;
  }

  return (
    <div
      className="mt-2 flex flex-col gap-3"
      data-testid="task-step-item-details"
    >
      {step.item.item_position ? (
        <div className="flex flex-col gap-1">
          <EyebrowLabel>Position</EyebrowLabel>
          <p className="text-sm text-foreground">{step.item.item_position}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <InfoPill data-testid="task-step-item-qty-pill">
          <span className="text-sm">{step.item.quantity}x</span>
        </InfoPill>

        {step.item.item_category_id ? (
          <ItemCategoryPill categoryId={step.item.item_category_id} />
        ) : null}
      </div>
    </div>
  );
}
