import { SearchBar } from "@beyo/ui";

type UpholsterySearchProps = {
  value: string;
  isLoading?: boolean;
  activeFilterCount?: number;
  onChange: (q: string) => void;
  onFilterPress?: () => void;
};

export function UpholsterySearch({
  value,
  isLoading = false,
  activeFilterCount = 0,
  onChange,
  onFilterPress,
}: UpholsterySearchProps): React.JSX.Element {
  return (
    <SearchBar
      activeFilterCount={activeFilterCount}
      isLoading={isLoading}
      showFilterButton={Boolean(onFilterPress)}
      showSortButton={false}
      data-testid="upholstery-search"
      value={value}
      placeholder="Search upholstery"
      onChange={onChange}
      onFilterPress={onFilterPress}
    />
  );
}
