import { useEffect } from 'react';

import { useUpholsteryPickerOptionsQuery } from '../api/use-upholstery-picker-options';
import { useUpholsterySelectionStore } from '../store/upholstery-selection.store';

export function useUpholsteryPickerFlow() {
  const storeOptions = useUpholsterySelectionStore((state) => state.options);
  const setOptions = useUpholsterySelectionStore((state) => state.setOptions);

  const { data, isPending } = useUpholsteryPickerOptionsQuery(
    {},
    { enabled: storeOptions.length === 0 },
  );

  useEffect(() => {
    if (data?.upholsteries && storeOptions.length === 0) {
      setOptions(data.upholsteries);
    }
  }, [data, setOptions, storeOptions.length]);

  return {
    options: storeOptions.length > 0 ? storeOptions : (data?.upholsteries ?? []),
    isLoading: isPending && storeOptions.length === 0,
  };
}
