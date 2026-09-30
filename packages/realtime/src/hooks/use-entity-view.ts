import { useEffect } from "react";
import { useEntityViewRegistryContext } from "../providers/RealtimeProvider";

/**
 * Holds the entity's view open while mounted: the provider announces it
 * (`view_entity`) on the current connection and on every reconnection, and
 * leaves it (`leave_entity`) once its last consumer unmounts. Several
 * consumers of the same entity share one view.
 */
export function useEntityView(entityType: string, entityClientId: string | null): void {
  const views = useEntityViewRegistryContext();

  useEffect(() => {
    if (!entityClientId) return;
    if (!views) {
      console.warn(
        `[RT:view_entity] skipped — no RealtimeProvider (type="${entityType}", id="${entityClientId}")`,
      );
      return;
    }
    return views.register(entityType, entityClientId);
  }, [views, entityType, entityClientId]);
}
