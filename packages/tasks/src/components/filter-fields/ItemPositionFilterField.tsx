import { TextInput } from "@beyo/ui";

type ItemPositionFilterFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Single text input that filters tasks/steps by `item_position` (wagon number).
 * The backend prefix-matches this value (`item_position ILIKE "{value}%"`), so a
 * partial value like "3" is valid. Unlike ItemPositionZoneField there is no zone
 * tab, BoxSlidePicker, or article lookup — this is item_position only.
 */
export function ItemPositionFilterField({
  value,
  onChange,
}: ItemPositionFilterFieldProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3" data-testid="item-position-filter-field">
      <p className="text-sm font-medium text-muted-foreground">Wagon</p>
      <TextInput
        data-testid="item-position-filter-input"
        id="item-position-filter"
        placeholder="e.g. 3"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
