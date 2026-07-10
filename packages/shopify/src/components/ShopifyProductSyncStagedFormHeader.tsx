type ShopifyProductSyncStagedFormHeaderProps = {
  title: string;
};

export function ShopifyProductSyncStagedFormHeader({
  title,
}: ShopifyProductSyncStagedFormHeaderProps): React.JSX.Element {
  return (
    <div className="flex min-h-14 items-center px-4">
      <h1 className="truncate text-base font-semibold">{title}</h1>
    </div>
  );
}
