import { useEffect } from 'react';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useTestSurfaceContext } from '../providers/TestSurfaceProvider';

export function TestNestedSlideContent(): React.JSX.Element {
  const { openSheet } = useTestSurfaceContext();
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle('Nested Test Slide');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-sm text-muted-foreground">
        This is the <strong>second slide</strong> surface for nested interaction testing.
      </p>

      <button
        className="rounded-xl bg-foreground px-5 py-4 text-left text-background"
        onClick={openSheet}
        type="button"
      >
        <div className="font-semibold">Open Original Sheet from Nested Slide</div>
        <div className="mt-0.5 text-xs opacity-60">Brings a sheet above this nested slide</div>
      </button>
    </div>
  );
}
