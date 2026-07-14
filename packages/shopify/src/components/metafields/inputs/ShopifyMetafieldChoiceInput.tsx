import {
  SearchableSelectInput,
  type SearchableSelectOption,
  type SearchableSelectResult,
} from "@beyo/ui";

export function ShopifyMetafieldChoiceInput({
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
  const selected = options.find((option) => option.value === value);
  const result: SearchableSelectResult | null = selected
    ? { type: "option", option: selected }
    : null;

  return (
    <SearchableSelectInput
      id={id}
      options={options}
      value={result}
      onValueChange={(next) => {
        if (next === null) onChange("");
        if (next?.type === "option") onChange(next.option.value);
      }}
      forceSelection
      disabled={disabled}
      data-testid="shopify-metafield-choice-input"
    />
  );
}
