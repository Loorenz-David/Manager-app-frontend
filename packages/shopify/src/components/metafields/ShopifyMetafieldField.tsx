import type { ShopifyMetafieldField as Field } from "../../types";
import { ShopifyMetafieldInputResolver } from "./ShopifyMetafieldInputResolver";

type DragHandleProps = Record<string, unknown>;

export function ShopifyMetafieldField({
  field,
  value,
  showShopIdentity,
  onChange,
  isEditMode,
  hasItemCategory,
  onAdd,
  onRemove,
  isMutating,
  dragHandleProps,
}: {
  field: Field;
  value: string;
  showShopIdentity: boolean;
  onChange: (value: string) => void;
  isEditMode: boolean;
  hasItemCategory: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  isMutating?: boolean;
  dragHandleProps?: DragHandleProps;
}): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-2 "
      data-testid={`shopify-metafield-field-${field.identity}`}
    >
      {showShopIdentity ? (
        <p className="text-xs font-medium text-muted-foreground">
          {field.shopDisplayName}
        </p>
      ) : null}
      <ShopifyMetafieldInputResolver
        field={field}
        value={value}
        onChange={onChange}
        isEditMode={isEditMode}
        hasItemCategory={hasItemCategory}
        onAdd={onAdd}
        onRemove={onRemove}
        isMutating={isMutating}
        dragHandleProps={dragHandleProps}
      />
      {/* <p className="text-xs text-muted-foreground">
        {field.namespace}.{field.key} · {field.type}
      </p> */}
      {/* {field.description ? (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      ) : null} */}
    </div>
  );
}
