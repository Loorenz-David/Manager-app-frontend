import {
  TagSelectInput,
  type SearchableSelectOption,
  type SearchableSelectResult,
} from "@beyo/ui";

import {
  parseShopifyMetafieldTagsValue,
  stringifyShopifyMetafieldTagsValue,
} from "../../../lib/shopify-metafield-tags-value";

export function ShopifyMetafieldTagsInput({
  id,
  choices,
  value,
  onChange,
  disabled,
}: {
  id: string;
  choices: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const options: SearchableSelectOption[] = choices.map((choice) => ({
    value: choice,
    displayValue: choice,
  }));
  const tags = parseShopifyMetafieldTagsValue(value);
  const result: SearchableSelectResult[] = tags.map((tag) => {
    const matched = options.find((option) => option.value === tag);
    return matched
      ? { type: "option", option: matched }
      : { type: "text", text: tag };
  });

  return (
    <TagSelectInput
      id={id}
      options={options}
      value={result}
      onValueChange={(next) =>
        onChange(
          stringifyShopifyMetafieldTagsValue(
            next.map((entry) =>
              entry.type === "option" ? entry.option.value : entry.text,
            ),
          ),
        )
      }
      forceSelection={choices.length > 0}
      disabled={disabled}
      data-testid="shopify-metafield-tags-input"
    />
  );
}
