export type SearchableSelectOption<TValue extends string = string> = {
  value: TValue;
  displayValue: string;
  disabled?: boolean;
};

export type SearchableSelectResult<TValue extends string = string> =
  | { type: "option"; option: SearchableSelectOption<TValue> }
  | { type: "text"; text: string };
