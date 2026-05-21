import { useEffect, useMemo, useState } from 'react';

import { SearchBar } from '@/components/primitives';
import type { UpholsteryPickerRecord } from '@/features/upholstery/types';

type UpholsterySearchProps = {
  items: UpholsteryPickerRecord[];
  onFilteredResults: (items: UpholsteryPickerRecord[]) => void;
};

function filterAndSort(
  items: UpholsteryPickerRecord[],
  query: string,
  ascending: boolean,
): UpholsteryPickerRecord[] {
  const q = query.trim().toLocaleLowerCase();
  const filtered = q
    ? items.filter(
        (item) =>
          item.name.toLocaleLowerCase().includes(q) ||
          (item.code?.toLocaleLowerCase().includes(q) ?? false),
      )
    : items;
  return [...filtered].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    return ascending ? cmp : cmp * -1;
  });
}

export function UpholsterySearch({
  items,
  onFilteredResults,
}: UpholsterySearchProps): React.JSX.Element {
  const [searchText, setSearchText] = useState('');
  const [isAscending, setIsAscending] = useState(true);

  const filtered = useMemo(
    () => filterAndSort(items, searchText, isAscending),
    [items, searchText, isAscending],
  );

  useEffect(() => {
    onFilteredResults(filtered);
  }, [filtered, onFilteredResults]);

  return (
    <SearchBar
      data-testid="upholstery-search"
      value={searchText}
      placeholder="Search upholstery"
      activeFilterCount={0}
      onChange={setSearchText}
      onFilterPress={() => {}}
      onSortPress={() => {
        setIsAscending((current) => !current);
      }}
    />
  );
}
