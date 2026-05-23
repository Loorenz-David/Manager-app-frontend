import { SearchBar } from '@/components/primitives';

type UpholsterySearchProps = {
  value: string;
  onChange: (q: string) => void;
};

export function UpholsterySearch({
  value,
  onChange,
}: UpholsterySearchProps): React.JSX.Element {
  return (
    <SearchBar
      data-testid="upholstery-search"
      value={value}
      placeholder="Search upholstery"
      activeFilterCount={0}
      onChange={onChange}
      onFilterPress={() => {}}
      onSortPress={() => {}}
    />
  );
}
