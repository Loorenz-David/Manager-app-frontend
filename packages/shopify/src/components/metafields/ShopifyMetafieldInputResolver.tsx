import { ConfirmActionButton, FieldLabelRow } from "@beyo/ui";
import { GripVertical, Plus, X } from "lucide-react";

import { parseMetafieldChoices } from "../../lib/parse-metafield-choices";
import { resolveMetafieldInputKind } from "../../lib/resolve-shopify-metafield-input";
import type { ShopifyMetafieldField } from "../../types";
import { ShopifyMetafieldUnsupportedField } from "./ShopifyMetafieldUnsupportedField";
import { ShopifyMetafieldChoiceInput } from "./inputs/ShopifyMetafieldChoiceInput";
import { ShopifyMetafieldDimensionInput } from "./inputs/ShopifyMetafieldDimensionInput";
import { ShopifyMetafieldTextInput } from "./inputs/ShopifyMetafieldTextInput";
import { ShopifyMetafieldTagsInput } from "./inputs/ShopifyMetafieldTagsInput";
import { ShopifyMetafieldUrlInput } from "./inputs/ShopifyMetafieldUrlInput";

export function ShopifyMetafieldInputResolver({
  field,
  value,
  onChange,
  isEditMode,
  hasItemCategory,
  onAdd,
  onRemove,
  isMutating,
  dragHandleProps,
  disabled,
}: {
  field: ShopifyMetafieldField;
  value: string;
  onChange: (value: string) => void;
  isEditMode: boolean;
  hasItemCategory: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  isMutating?: boolean;
  dragHandleProps?: Record<string, unknown>;
  disabled?: boolean;
}): React.JSX.Element {
  const inputId = `shopify-metafield-${encodeURIComponent(field.identity)}`;
  const kind = resolveMetafieldInputKind(field);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabelRow
        label={field.name}
        htmlFor={kind === "unsupported" ? undefined : inputId}
      >
        {kind === "dimension" ? (
          <span className="text-xs text-muted-foreground">(cm)</span>
        ) : null}
      </FieldLabelRow>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          {kind === "choice" ? (
            <ShopifyMetafieldChoiceInput
              id={inputId}
              choices={parseMetafieldChoices(field.validations)}
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          ) : kind === "text" ? (
            <ShopifyMetafieldTextInput
              id={inputId}
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          ) : kind === "tags" ? (
            <ShopifyMetafieldTagsInput
              id={inputId}
              choices={parseMetafieldChoices(field.validations)}
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          ) : kind === "url" ? (
            <ShopifyMetafieldUrlInput
              id={inputId}
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          ) : kind === "dimension" ? (
            <ShopifyMetafieldDimensionInput
              id={inputId}
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          ) : (
            <ShopifyMetafieldUnsupportedField type={field.type} />
          )}
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {!isEditMode &&
            field.source === "search_result" &&
            hasItemCategory &&
            onAdd ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-sm text-card shadow-sm disabled:opacity-50"
                onClick={onAdd}
                disabled={disabled || isMutating}
                aria-label={`Add ${field.name}`}
                data-testid={`shopify-metafield-add-${field.identity}`}
              >
                <Plus aria-hidden="true" className="size-4" />
                Add
              </button>
            ) : null}
            {isEditMode && field.source === "saved_preference" && onRemove ? (
              <ConfirmActionButton
                className="rounded-full px-3 py-2 text-sm shadow-sm"
                backgroundColor="bg-card"
                borderColor="var(--color-destructive)"
                textColor="var(--color-destructive)"
                label="Remove"
                confirmLabel="Confirm"
                icon={<X aria-hidden="true" className="size-4" />}
                disabled={disabled || isMutating}
                data-testid={`shopify-metafield-remove-${field.identity}`}
                onConfirm={onRemove}
              />
            ) : null}
          </div>
        </div>
        {isEditMode &&
        field.source === "saved_preference" &&
        dragHandleProps ? (
          <button
            type="button"
            className="inline-flex size-12 shrink-0 touch-none items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-50"
            disabled={disabled || isMutating}
            aria-label={`Reorder ${field.name}`}
            data-testid={`shopify-metafield-drag-handle-${field.identity}`}
            {...dragHandleProps}
          >
            <GripVertical aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
