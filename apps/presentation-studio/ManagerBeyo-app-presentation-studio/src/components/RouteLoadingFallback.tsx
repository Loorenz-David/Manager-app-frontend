export function RouteLoadingFallback(): React.JSX.Element {
  return (
    <div
      aria-label="Loading page"
      className="flex min-h-screen items-center justify-center bg-muted text-sm text-muted-foreground"
    >
      Loading…
    </div>
  );
}
