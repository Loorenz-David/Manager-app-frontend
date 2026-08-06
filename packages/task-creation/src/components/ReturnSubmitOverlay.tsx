import { TaskCreationSubmitOverlay } from "./TaskCreationSubmitOverlay";

export type ReturnSubmitOverlayPhase = "creating" | "succeeded";

type ReturnSubmitOverlayProps = {
  phase: ReturnSubmitOverlayPhase;
  sku: string;
  isSkuProvisional?: boolean;
  onDismiss?: () => void;
};

const CONTENT: Record<
  ReturnSubmitOverlayPhase,
  { title: string; description?: string }
> = {
  creating: { title: "Creating return…" },
  succeeded: { title: "Return created" },
};

/**
 * Return has no background-worker step to wait on — unlike pre-order, whose
 * overlay also tracks a queued Shopify product — so this only ever waits on
 * the single task-creation request. A request that fails drops the overlay
 * entirely rather than entering a blocking error phase: useCreateTask's own
 * onError already notifies, and the form stays editable for a retry.
 */
export function ReturnSubmitOverlay({
  phase,
  sku,
  isSkuProvisional,
  onDismiss,
}: ReturnSubmitOverlayProps): React.JSX.Element {
  const content = CONTENT[phase];

  return (
    <TaskCreationSubmitOverlay
      phase={phase}
      title={content.title}
      description={content.description}
      sku={sku}
      isSkuProvisional={isSkuProvisional}
      onDismiss={onDismiss}
    />
  );
}
