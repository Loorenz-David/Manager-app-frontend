// Deliberate empty state over a still-visible grid, so the user keeps
// time-of-day context. Never fabricates all-day idle events — absence of
// segments is NOT backend-confirmed idle time. Rendered INSIDE a pager page
// (positioned within the day grid) so it slides with the pages instead of
// floating over the whole surface. `top-[36%]` keeps it inside the default
// (~07:00) viewport while scrolling/sliding with the grid.
export function TimelineEmptyState(): React.JSX.Element {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[36%] z-10 flex justify-center px-4"
      data-testid="timeline-empty-state"
    >
      <div className="rounded-2xl bg-card px-5 py-4 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">
          No recorded activity
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Nothing was tracked for the selected dates.
        </p>
      </div>
    </div>
  );
}
