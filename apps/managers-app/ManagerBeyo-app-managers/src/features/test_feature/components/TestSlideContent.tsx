import { useEffect } from 'react';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useTestSurfaceContext } from '../providers/TestSurfaceProvider';

export function TestSlideContent(): React.JSX.Element {
  const { openNestedSheet } = useTestSurfaceContext();
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle('Test Slide');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-sm text-muted-foreground">
        This is the <strong>slide page</strong> surface. Use the <strong>‹</strong> button in the
        header to close with a slide-out animation.
      </p>

      <button
        className="rounded-xl bg-foreground px-5 py-4 text-left text-background"
        onClick={openNestedSheet}
        type="button"
      >
        <div className="font-semibold">Open Nested Sheet from Slide</div>
        <div className="mt-0.5 text-xs opacity-60">Stacks a second sheet surface on top</div>
      </button>
    </div>
  );
}
