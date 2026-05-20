import { useTestSurfaceContext } from '../providers/TestSurfaceProvider';

export function TestLauncher(): React.JSX.Element {
  const { openSheet, openSlide } = useTestSurfaceContext();

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="surface-test-lab">
      <div>
        <h1 className="text-2xl font-bold">Surface Test Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test surface stacking: open, nest, and close sheet and slide surfaces.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          className="rounded-xl bg-foreground px-5 py-4 text-left text-background"
          onClick={openSheet}
          type="button"
        >
          <div className="font-semibold">Open Bottom Sheet</div>
          <div className="mt-0.5 text-xs opacity-60">sheet surface · Vaul drag-dismiss</div>
        </button>

        <button
          className="rounded-xl bg-foreground px-5 py-4 text-left text-background"
          onClick={openSlide}
          type="button"
        >
          <div className="font-semibold">Open Slide Page</div>
          <div className="mt-0.5 text-xs opacity-60">slide surface · Framer Motion push</div>
        </button>
      </div>
    </div>
  );
}
