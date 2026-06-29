import { SearchBar } from "@/components/primitives";

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
      data-testid="upholstery-search"
      value={value}
      placeholder="Search upholstery"
      onChange={onChange}
      onFilterPress={onFilterPress}
    />
  );
}
