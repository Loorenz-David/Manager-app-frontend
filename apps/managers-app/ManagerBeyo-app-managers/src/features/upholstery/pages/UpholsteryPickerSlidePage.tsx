import { useEffect, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';

import { UpholsteryCard } from '@/features/upholstery/components/UpholsteryCard';
import { UpholsteryPickerHeader } from '@/features/upholstery/components/UpholsteryPickerHeader';
import { useUpholsteryPickerController } from '@/features/upholstery/controllers/use-upholstery-picker.controller';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

import { transitions } from '@/lib/animation';

type UpholsteryPickerSlidePageProps = {
  currentClientId?: string | null;
  title?: string;
  description?: string;
  onSelect?: (clientId: string) => void;
};

const bodyVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: transitions.slide,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    transition: transitions.slide,
  }),
} as const;

export function UpholsteryPickerSlidePage(): React.JSX.Element {
  const { currentClientId, title, description, onSelect } =
    useSurfaceProps<UpholsteryPickerSlidePageProps>();
  const header = useSurfaceHeader();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const controller = useUpholsteryPickerController(debouncedQuery);
  const isSearchActive = searchQuery.trim().length > 0;

  useEffect(() => {
    header?.setTitle(title ?? 'Select upholstery');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]); // header omitted — SurfaceHeaderContext.Provider creates a new object every SlidePageSurface render, making header unstable; setTitle is safe to call with a stale reference

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  function handleSelect(clientId: string): void {
    onSelect?.(clientId);
    header?.requestClose();
  }

  return (
    <div
      className="flex min-h-full flex-col overflow-hidden"
      data-testid="upholstery-picker-slide-page"
    >
      <UpholsteryPickerHeader
        activeFilter={controller.activeFilter}
        description={description}
        isFilterDisabled={isSearchActive}
        q={searchQuery}
        onFilterChange={controller.onFilterChange}
        onQChange={setSearchQuery}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <AnimatePresence custom={controller.direction} initial={false} mode="sync">
          <m.div
            key={controller.activeFilter}
            animate="center"
            className="absolute inset-0 flex flex-col gap-3 overflow-y-auto px-4 py-4"
            custom={controller.direction}
            data-testid={`upholstery-picker-body-${controller.activeFilter}`}
            exit="exit"
            initial="enter"
            variants={bodyVariants}
          >
            {controller.isLoading && controller.upholsteries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading upholstery…
              </p>
            ) : controller.upholsteries.length > 0 ? (
              controller.upholsteries.map((record) => (
                <UpholsteryCard
                  key={record.client_id}
                  isSelected={record.client_id === currentClientId}
                  record={record}
                  testId={`upholstery-card-${record.client_id}`}
                  onOpenReorder={controller.openReorderSheet}
                  onSelect={handleSelect}
                  onToggleFavorite={controller.toggleFavorite}
                />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No results.
              </p>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
