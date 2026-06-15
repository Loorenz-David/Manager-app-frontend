type PendingUpholsteryEmptyStateProps = {
  missingSelection: boolean;
  missingQuantity: boolean;
  hasSearch: boolean;
};

export function PendingUpholsteryEmptyState({
  missingSelection,
  missingQuantity,
  hasSearch,
}: PendingUpholsteryEmptyStateProps): React.JSX.Element {
  const message = hasSearch
    ? "No matching pending upholstery tasks were found."
    : missingSelection && !missingQuantity
      ? "No seat tasks are missing an upholstery selection."
      : !missingSelection && missingQuantity
        ? "No seat tasks are missing an upholstery amount."
        : "No seat tasks have pending upholstery information.";

  return (
    <div className="flex min-h-[50dvh] items-center justify-center px-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
