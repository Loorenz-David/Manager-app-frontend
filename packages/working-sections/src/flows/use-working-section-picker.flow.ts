import { useEffect } from "react";

import { useWorkingSectionsPickerQuery } from "../api/use-working-sections-picker-query";
import { useWorkingSectionSelectionStore } from "../store/working-section-selection.store";

export function useWorkingSectionPickerFlow() {
  const storeOptions = useWorkingSectionSelectionStore((state) => state.options);
  const setOptions = useWorkingSectionSelectionStore((state) => state.setOptions);

  const { data, isPending } = useWorkingSectionsPickerQuery({
    enabled: storeOptions.length === 0,
  });

  useEffect(() => {
    if (data?.workingSections && storeOptions.length === 0) {
      setOptions(data.workingSections);
    }
  }, [data, setOptions, storeOptions.length]);

  return {
    options: storeOptions.length > 0 ? storeOptions : (data?.workingSections ?? []),
    isLoading: isPending && storeOptions.length === 0,
  };
}
