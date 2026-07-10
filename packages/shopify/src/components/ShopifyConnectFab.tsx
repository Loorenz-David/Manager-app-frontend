import { Plus } from "lucide-react";

type ShopifyConnectFabProps = {
  onPress: () => void;
};

export function ShopifyConnectFab({
  onPress,
}: ShopifyConnectFabProps): React.JSX.Element {
  return (
    <button
      aria-label="Connect Shopify shop"
      className="absolute bottom-[calc(var(--safe-bottom,0px)+5.75rem)] right-4 z-20 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md"
      type="button"
      onClick={onPress}
    >
      <Plus aria-hidden="true" className="size-6" />
    </button>
  );
}
