import { SearchBar } from "@beyo/ui";

type EmailInboxHeaderProps = {
  searchValue: string;
  isLoading: boolean;
  showFilterButton?: boolean;
  activeFilterCount?: number;
  onSearchChange: (value: string) => void;
  onFilterPress?: () => void;
};

export function EmailInboxHeader({
  searchValue,
  isLoading,
  showFilterButton,
  activeFilterCount,
  onSearchChange,
  onFilterPress,
}: EmailInboxHeaderProps): React.JSX.Element {
  return (
    <div className="bg-background px-4 pb-3 pt-4">
      <SearchBar
        activeFilterCount={activeFilterCount ?? 0}
        isLoading={isLoading}
        placeholder="Search inbox"
        showFilterButton={showFilterButton ?? false}
        showSortButton={false}
        value={searchValue}
        onChange={onSearchChange}
        onFilterPress={onFilterPress}
      />
    </div>
  );
}
