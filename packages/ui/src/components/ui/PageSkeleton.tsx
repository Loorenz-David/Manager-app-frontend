export function PageSkeleton(): React.JSX.Element {
  return (
    <div className="flex animate-pulse flex-col gap-4 p-6">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-4 w-5/6 rounded bg-muted" />
    </div>
  );
}
