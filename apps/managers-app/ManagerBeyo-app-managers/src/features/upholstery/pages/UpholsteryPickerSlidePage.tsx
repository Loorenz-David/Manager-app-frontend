import { useEffect, useState } from 'react';

import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { TEST_UPHOLSTERIES } from '@/features/upholstery/upholstery-test-data';
import type { UpholsteryPickerRecord } from '@/features/upholstery/types';
import { UpholsteryCard } from '@/features/upholstery/components/UpholsteryCard';
import { UpholsterySearch } from '@/features/upholstery/components/UpholsterySearch';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

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
  const [filteredItems, setFilteredItems] =
    useState<UpholsteryPickerRecord[]>(TEST_UPHOLSTERIES);

  useEffect(() => {
    header?.setTitle(title ?? 'Select upholstery');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]); // header omitted — SurfaceHeaderContext.Provider creates a new object every SlidePageSurface render, making header unstable; setTitle is safe to call with a stale reference

  function handleSelect(clientId: string): void {
    onSelect?.(clientId);
    useSurfaceStore.getState().closeTop();
  }

  return (
    <div className="flex min-h-full flex-col" data-testid="upholstery-picker-slide-page">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
        <UpholsterySearch items={TEST_UPHOLSTERIES} onFilteredResults={setFilteredItems} />
        {description ? (
          <p className="mt-3 text-sm text-muted-foreground" data-testid="upholstery-picker-description">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((record) => (
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
            No upholstery matches your search.
          </p>
        )}
      </div>
    </div>
  );
}
