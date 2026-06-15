type PendingUpholsteryErrorStateProps = {
  onRetry: () => void;
};

export function PendingUpholsteryErrorState({
  onRetry,
}: PendingUpholsteryErrorStateProps): React.JSX.Element {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 px-8 text-center">
      <p className="text-sm text-muted-foreground">
        Pending upholstery tasks could not be loaded.
      </p>
      <button
        className="rounded-full bg-card px-5 py-2 text-sm font-medium text-primary shadow-sm"
        type="button"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}
