import { useEffect, useRef, useState } from "react";

import { SearchBar } from "@/components/primitives";

import { useGetUpholsteryCategoryQuery } from "../api/use-get-upholstery-category-query";
import { useListUpholsteryCategoriesQuery } from "../api/use-list-upholstery-categories-query";
import type { UpholsteryCategory } from "../types";
import { UpholsteryCategoryCard } from "./UpholsteryCategoryCard";

type Props = {
  value: string | null;
  onChange: (id: string | null, category: UpholsteryCategory | null) => void;
  prefillCategoryId?: string | null;
};

export function UpholsteryCategoryPickerField({
  value,
  onChange,
  prefillCategoryId = null,
}: Props): React.JSX.Element {
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const prefillApplied = useRef(false);
  const prefillQuery = useGetUpholsteryCategoryQuery(prefillCategoryId, {
    enabled: Boolean(prefillCategoryId),
  });
  const listQuery = useListUpholsteryCategoriesQuery({
    q: activeQuery || undefined,
  });

  useEffect(() => {
    if (prefillQuery.data && !prefillApplied.current) {
      prefillApplied.current = true;
      setSearchInput(prefillQuery.data.name);
    }
  }, [prefillQuery.data]);

  function handleSearchChange(nextValue: string): void {
    setSearchInput(nextValue);
    setActiveQuery(nextValue);
  }

  function handleCardPress(category: UpholsteryCategory): void {
    const isSelected = value === category.client_id;

    onChange(
      isSelected ? null : category.client_id,
      isSelected ? null : category,
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
      <SearchBar
        isLoading={listQuery.isFetching}
        placeholder="Search categories..."
        value={searchInput}
        onChange={handleSearchChange}
      />

      <div className="flex flex-col gap-3">
        {listQuery.isPending && listQuery.data === undefined ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Loading categories...
          </p>
        ) : listQuery.data?.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            No categories found.
          </p>
        ) : (
          (listQuery.data?.items ?? []).map((category) => (
            <UpholsteryCategoryCard
              key={category.client_id}
              category={category}
              isSelected={value === category.client_id}
              onPress={handleCardPress}
            />
          ))
        )}
      </div>
    </div>
  );
}
