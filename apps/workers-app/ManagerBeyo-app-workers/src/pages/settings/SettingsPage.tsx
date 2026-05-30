import { lazy, Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const SettingsRouteEntry = lazy(() =>
  import("@/features/settings/route-entry").then((module) => ({
    default: module.SettingsRouteEntry,
  })),
);

export function SettingsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsRouteEntry />
    </Suspense>
  );
}
