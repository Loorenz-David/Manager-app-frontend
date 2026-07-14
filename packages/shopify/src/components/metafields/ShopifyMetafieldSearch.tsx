import { SearchBar } from "@beyo/ui";
import { Check, Pencil } from "lucide-react";

export function ShopifyMetafieldSearch({
  value,
  onChange,
  isLoading,
  disabled,
  isEditMode,
  onToggleEditMode,
  editDisabled,
}: {
  value: string;
  onChange: (value: string) => void;
  isLoading: boolean;
  disabled: boolean;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  editDisabled: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <SearchBar
          value={value}
          onChange={onChange}
          isLoading={isLoading}
          disabled={disabled}
          showSortButton={false}
          showFilterButton={false}
          placeholder="Search metafields by name"
          data-testid="shopify-metafield-search"
        />
      </div>
      <button
        type="button"
        className={`inline-flex size-10.5 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isEditMode
            ? "bg-primary text-card"
            : "bg-card border border-light-border  text-icon shadow-sm"
        }`}
        onClick={onToggleEditMode}
        disabled={editDisabled}
        aria-label={
          isEditMode
            ? "Done editing metafield preferences"
            : "Edit metafield preferences"
        }
        data-testid="shopify-metafield-edit-toggle"
      >
        {isEditMode ? (
          <Check aria-hidden="true" className="size-4.5" />
        ) : (
          <Pencil aria-hidden="true" className="size-4.5" />
        )}
      </button>
    </div>
  );
}
