import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { imageKeys, useCreateImagesFromUrl, useDeleteImage } from "@beyo/images";

import { buildCreateImagesFromUrlBatch } from "../lib/item-lookup-prefill";
import type { ItemLookupResult } from "../types";

type LookupImages = ItemLookupResult["images"];

type OwnedLookupImages = {
  itemClientId: string;
  imageClientIds: string[];
};

/**
 * Owns the item images a purchase-API lookup prefills.
 *
 * The draft item keeps one client id for the whole form, so without this every
 * lookup that lands piles its images on top of the previous one's — correct an
 * article number and you end up holding both items' pictures. Applying a result
 * drops the images the last one contributed, and a batch that is superseded
 * while still uploading is deleted on arrival, so what hangs on the item always
 * belongs to the article number currently on screen.
 *
 * Only images this hook created are ever removed; pictures the user took
 * themselves are untouched, as are images left on an item the form has already
 * submitted.
 */
export function useLookupItemImages(
  itemClientId: string,
): (images: LookupImages) => void {
  const queryClient = useQueryClient();
  const createImagesFromUrl = useCreateImagesFromUrl();
  const { deleteImageWithOptionsAsync } = useDeleteImage();
  const ownedRef = useRef<OwnedLookupImages | null>(null);
  const latestApplyIdRef = useRef(0);

  // Read at upload-resolution time to tell "the user corrected the article
  // number" apart from "the form was submitted and moved on to a fresh item".
  const itemClientIdRef = useRef(itemClientId);
  useEffect(() => {
    itemClientIdRef.current = itemClientId;
  }, [itemClientId]);

  function discard(imageClientIds: string[]): void {
    for (const imageClientId of imageClientIds) {
      void deleteImageWithOptionsAsync({
        imageClientId,
        hardDelete: true,
      }).catch(() => {});
    }
  }

  return function applyLookupImages(images: LookupImages): void {
    const applyId = ++latestApplyIdRef.current;
    const targetItemClientId = itemClientId;
    const owned = ownedRef.current;

    ownedRef.current = null;
    if (owned && owned.itemClientId === targetItemClientId) {
      discard(owned.imageClientIds);
    }

    if (images.length === 0) {
      return;
    }

    void createImagesFromUrl
      .mutateAsync(buildCreateImagesFromUrlBatch(images, targetItemClientId))
      .then((created) => {
        const createdImageClientIds = created.map((image) => image.client_id);

        // The form moved on to a fresh draft item, which means the task was
        // submitted — the created task owns these now, so leave them be.
        if (itemClientIdRef.current !== targetItemClientId) {
          return;
        }

        if (latestApplyIdRef.current !== applyId) {
          discard(createdImageClientIds);
          return;
        }

        ownedRef.current = {
          itemClientId: targetItemClientId,
          imageClientIds: createdImageClientIds,
        };

        void queryClient.invalidateQueries({
          queryKey: imageKeys.list({
            entity_type: "item",
            entity_client_id: targetItemClientId,
          }),
        });
      })
      .catch(() => {});
  };
}
