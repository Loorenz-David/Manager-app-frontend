import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useTestSurfaceContext } from '../providers/TestSurfaceProvider';

export function TestSheetContent(): React.JSX.Element {
  const { openNestedSlide } = useTestSurfaceContext();
  const header = useSurfaceHeader();

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Test Sheet</span>
        <button
          aria-label="Close sheet"
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-muted"
          onClick={() => header?.requestClose()}
          type="button"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">
          This is the <strong>bottom sheet</strong> surface. Dismiss by dragging down, tapping ✕,
          or opening another surface on top.
        </p>

        <button
          className="rounded-xl bg-foreground px-5 py-4 text-left text-background"
          onClick={openNestedSlide}
          type="button"
        >
          <div className="font-semibold">Open Nested Slide from Sheet</div>
          <div className="mt-0.5 text-xs opacity-60">Stacks a second slide surface on top</div>
        </button>
      </div>
    </div>
  );
}
