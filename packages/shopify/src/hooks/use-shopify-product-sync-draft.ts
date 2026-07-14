import { useCallback, useEffect, useState } from "react";
import type { ShopifyProductSyncFormValues } from "../types";
import {
  deleteExpiredShopifyProductSyncDrafts,
  deleteShopifyProductSyncDraft,
  getShopifyProductSyncDraft,
  saveShopifyProductSyncDraft,
} from "../drafts/shopify-product-sync-draft-repository";

export function useShopifyProductSyncDraft(taskClientId: string) {
  const [isRestoring, setIsRestoring] = useState(Boolean(taskClientId));
  const [restoredValues, setRestoredValues] =
    useState<ShopifyProductSyncFormValues | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRestoredValues(null);
    if (!taskClientId) {
      setIsRestoring(false);
      return () => {
        cancelled = true;
      };
    }

    setIsRestoring(true);
    void (async () => {
      await deleteExpiredShopifyProductSyncDrafts();
      const values = await getShopifyProductSyncDraft(taskClientId);
      if (!cancelled) {
        setRestoredValues(values);
        setIsRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskClientId]);

  const save = useCallback(
    async (values: ShopifyProductSyncFormValues) => {
      setIsSaving(true);
      setSaveError(null);
      try {
        await saveShopifyProductSyncDraft({ taskClientId, values });
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Could not save draft.",
        );
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [taskClientId],
  );

  const discard = useCallback(
    () => deleteShopifyProductSyncDraft(taskClientId),
    [taskClientId],
  );

  return { isRestoring, restoredValues, isSaving, saveError, save, discard };
}
