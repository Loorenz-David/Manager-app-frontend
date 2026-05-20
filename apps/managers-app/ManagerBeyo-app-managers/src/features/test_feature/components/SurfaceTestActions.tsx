import { useTestSurfaceContext } from '../providers/TestSurfaceProvider';

export function SurfaceTestActions(): React.JSX.Element {
  const { openSheet, openSlide } = useTestSurfaceContext();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Surface Test
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open the shared sheet and slide surfaces from this primary page.
        </p>
      </div>

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
  );
}
