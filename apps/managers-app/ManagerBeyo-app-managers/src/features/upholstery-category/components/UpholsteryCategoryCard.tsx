import { cn } from "@/lib/utils";

import type { UpholsteryCategory } from "../types";

type UpholsteryCategoryCardProps = {
  category: UpholsteryCategory;
  isSelected?: boolean;
  onPress: (category: UpholsteryCategory) => void;
};

export function UpholsteryCategoryCard({
  category,
  isSelected = false,
  onPress,
}: UpholsteryCategoryCardProps): React.JSX.Element {
  return (
    <div
      aria-pressed={isSelected}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
        isSelected
          ? "border-primary bg-primary text-card"
          : "border-border bg-card text-foreground",
      )}
      role="button"
      tabIndex={0}
      onClick={() => onPress(category)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPress(category);
        }
      }}
    >
      {category.image_url ? (
        <img
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
          src={category.image_url}
        />
      ) : (
        <div className="size-10 shrink-0 rounded-full bg-muted" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{category.name}</p>
        <p
          className={cn(
            "mt-0.5 text-xs",
            isSelected ? "opacity-70" : "text-muted-foreground",
          )}
        >
          {category.upholstery_count} upholstery entries
        </p>
      </div>
    </div>
  );
}
