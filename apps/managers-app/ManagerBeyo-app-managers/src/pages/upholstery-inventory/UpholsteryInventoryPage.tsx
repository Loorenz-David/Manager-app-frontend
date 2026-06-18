import { lazy, Suspense } from "react";

import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { InventoryCreationFab } from "@/features/upholstery-inventory";

const UpholsteryInventoryRouteEntry = lazy(() =>
  import("@/features/upholstery-inventory").then((module) => ({
    default: module.UpholsteryInventoryRouteEntry,
  })),
);

export function UpholsteryInventoryPage(): React.JSX.Element {
  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <Suspense fallback={<PageSkeleton />}>
          <UpholsteryInventoryRouteEntry />
        </Suspense>
      </div>
      <InventoryCreationFab />
    </>
  );
}
