import { cva } from 'class-variance-authority';
import { ChevronRight } from 'lucide-react';

import {
  useUpholsteryPickerOptionQuery,
  useUpholsterySelectionStore,
} from '@/features/upholstery';
import { useSurface } from '@/hooks/use-surface';
import { cn } from '@/lib/utils';

const itemUpholsteryFieldVariants = cva(
  'flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
);

type ItemUpholsteryFieldProps = {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  description?: string;
  disabled?: boolean;
  testId?: string;
};

export function ItemUpholsteryField({
  value,
  onChange,
  placeholder = 'Select upholstery',
  title,
  description,
  disabled = false,
  testId,
}: ItemUpholsteryFieldProps): React.JSX.Element {
  const surface = useSurface();
  const storeOptions = useUpholsterySelectionStore((state) => state.options);
  const storeMatch = value
    ? storeOptions.find((entry) => entry.client_id === value) ?? null
    : null;
  const { data: fetchedOption, isPending } = useUpholsteryPickerOptionQuery(
    storeMatch === null ? value : null,
  );
  const selectedUpholstery = storeMatch ?? fetchedOption ?? null;
  const hasSelection = value !== null && value !== undefined;
  const isLoadingSelection = hasSelection && selectedUpholstery === null && isPending;

  function handlePress(): void {
    surface.open('upholstery-picker', {
      currentClientId: value,
      onSelect: onChange,
      title,
      description,
    });
  }

  return (
    <button
      type="button"
      data-testid={testId}
      className={itemUpholsteryFieldVariants()}
      disabled={disabled}
      onClick={handlePress}
    >
      {selectedUpholstery?.image_url ? (
        <img
          src={selectedUpholstery.image_url}
          alt={selectedUpholstery.name}
          className="size-10 shrink-0 rounded-full object-cover"
        />
      ) : selectedUpholstery ? (
        <div aria-hidden="true" className="size-10 shrink-0 rounded-full bg-muted" />
      ) : null}
      <span className="min-w-0 flex-1">
        {hasSelection ? (
          selectedUpholstery ? (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {selectedUpholstery.name}
              </span>
              {selectedUpholstery.code !== null ? (
                <span className="truncate text-xs text-muted-foreground">
                  {selectedUpholstery.code}
                </span>
              ) : null}
            </span>
          ) : isLoadingSelection ? (
            <span className="truncate text-sm text-muted-foreground">Loading upholstery…</span>
          ) : (
            <span className="truncate text-sm text-foreground">{value}</span>
          )
        ) : (
          <span className="truncate text-sm text-muted-foreground">{placeholder}</span>
        )}
      </span>
      <ChevronRight
        aria-hidden="true"
        className={cn(
          'size-4 shrink-0',
          hasSelection ? 'text-muted-foreground' : 'text-icon',
        )}
      />
    </button>
  );
}
