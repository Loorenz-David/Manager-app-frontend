import { lazy, Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const HomeRouteEntry = lazy(() =>
  import("@/features/home/route-entry").then((module) => ({
    default: module.HomeRouteEntry,
  })),
);

export function HomePage(): React.JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HomeRouteEntry />
    </Suspense>
  );
}
