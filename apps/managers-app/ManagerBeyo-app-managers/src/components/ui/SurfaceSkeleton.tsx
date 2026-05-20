import type { SurfaceType } from '@/providers/SurfaceProvider';

type Props = {
  surface: SurfaceType;
};

export function SurfaceSkeleton({ surface }: Props): React.JSX.Element {
  if (surface === 'modal') {
    return (
      <div className="flex animate-pulse flex-col gap-3 p-6">
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex animate-pulse flex-col gap-4 p-6">
      <div className="h-7 w-40 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-4/5 rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-20 w-full rounded bg-muted" />
    </div>
  );
}
