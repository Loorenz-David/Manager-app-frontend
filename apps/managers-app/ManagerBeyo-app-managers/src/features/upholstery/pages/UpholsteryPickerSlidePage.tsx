import { useEffect, useState } from 'react';

import { useUpholsteryPickerFlow } from '@/features/upholstery/flows/use-upholstery-picker.flow';
import { useUpholsteryPickerOptionsQuery } from '@/features/upholstery/api/use-upholstery-picker-options';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { UpholsteryCard } from '@/features/upholstery/components/UpholsteryCard';
import { UpholsterySearch } from '@/features/upholstery/components/UpholsterySearch';


type UpholsteryPickerSlidePageProps = {
  currentClientId?: string | null;
  title?: string;
  description?: string;
  onSelect?: (clientId: string) => void;
};

export function UpholsteryPickerSlidePage(): React.JSX.Element {
  const { currentClientId, title, description, onSelect } =
    useSurfaceProps<UpholsteryPickerSlidePageProps>();
  const header = useSurfaceHeader();
  const { options: initialOptions, isLoading } = useUpholsteryPickerFlow();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    header?.setTitle(title ?? 'Select upholstery');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]); // header omitted — SurfaceHeaderContext.Provider creates a new object every SlidePageSurface render, making header unstable; setTitle is safe to call with a stale reference

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const { data: searchData, isPending: isSearchPending } = useUpholsteryPickerOptionsQuery(
    { q: debouncedQuery },
    { enabled: debouncedQuery.trim().length > 0 },
  );

  const displayedOptions =
    debouncedQuery.trim().length > 0 ? (searchData?.upholsteries ?? []) : initialOptions;

  const isShowingLoading =
    (isLoading && displayedOptions.length === 0) ||
    (debouncedQuery.trim().length > 0 && isSearchPending);

  function handleSelect(clientId: string): void {
    onSelect?.(clientId);
    header?.requestClose();
  }

  return (
    <div className="flex min-h-full flex-col" data-testid="upholstery-picker-slide-page">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
        <UpholsterySearch value={searchQuery} onChange={setSearchQuery} />
        {description ? (
          <p className="mt-3 text-sm text-muted-foreground" data-testid="upholstery-picker-description">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {isShowingLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading upholstery…</p>
        ) : displayedOptions.length > 0 ? (
          displayedOptions.map((record) => (
            <UpholsteryCard
              key={record.client_id}
              record={record}
              isSelected={record.client_id === currentClientId}
              onSelect={handleSelect}
              testId={`upholstery-card-${record.client_id}`}
            />
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No results.
          </p>
        )}
      </div>
    </div>
  );
}
