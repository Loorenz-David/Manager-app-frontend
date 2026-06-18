import { InventoryListView } from "./components/InventoryListView";
import { InventoryListViewProvider } from "./providers/InventoryListViewProvider";

export function UpholsteryInventoryRouteEntry(): React.JSX.Element {
  return (
    <InventoryListViewProvider>
      <InventoryListView />
    </InventoryListViewProvider>
  );
}
