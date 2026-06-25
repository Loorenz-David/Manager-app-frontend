import { lazyWithPreload } from "@beyo/ui";

import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import type { UpholsteryId, UpholsteryInventoryId } from "@/types/common";

import type { EditInventoryPrefill } from "./types";

export const INVENTORY_DETAIL_SLIDE_ID = "upholstery-inventory-detail-slide";
export const INVENTORY_CREATION_SLIDE_ID =
  "upholstery-inventory-creation-slide";
export const STORED_AMOUNT_SHEET_ID = "upholstery-inventory-stored-amount";
export const INVENTORY_CARD_ACTIONS_SHEET_ID =
  "upholstery-inventory-card-actions";
export const INVENTORY_DETAIL_ACTIONS_SHEET_ID =
  "upholstery-inventory-detail-actions";

export type InventoryDetailSurfaceProps = {
  inventoryId: UpholsteryInventoryId;
};

export type InventoryCardActionsSurfaceProps = {
  inventoryId: UpholsteryInventoryId;
};

export type InventoryDetailActionsSurfaceProps = {
  inventoryId: UpholsteryInventoryId;
};

export type StoredAmountSurfaceProps = {
  inventoryId: UpholsteryInventoryId;
  prefill?: {
    currentStoredAmountMeters: string | null;
    imageUrl?: string | null;
    upholsteryName?: string;
    storedDisplay?: string;
  };
};

export type InventoryCreationPrefillData = {
  name: string;
  code: string | null;
  imageUrl: string | null;
  upholsteryClientId: string;
};

export type InventoryCreationSurfaceProps =
  | {
      mode: "edit";
      upholsteryId: UpholsteryId;
      inventoryId: UpholsteryInventoryId;
      prefill: EditInventoryPrefill;
    }
  | {
      mode: "prefill";
      prefill: InventoryCreationPrefillData;
    };

export function isPrefillInventorySurfaceProps(
  props: Partial<InventoryCreationSurfaceProps>,
): props is Extract<InventoryCreationSurfaceProps, { mode: "prefill" }> {
  return props.mode === "prefill" && Boolean(props.prefill);
}

export function isEditInventorySurfaceProps(
  props: Partial<InventoryCreationSurfaceProps>,
): props is Extract<InventoryCreationSurfaceProps, { mode: "edit" }> {
  return (
    props.mode === "edit" &&
    Boolean(props.upholsteryId) &&
    Boolean(props.inventoryId) &&
    Boolean(props.prefill)
  );
}

const detailSlide = lazyWithPreload(() =>
  import("./pages/UpholsteryInventoryDetailSlidePage").then((module) => ({
    default: module.UpholsteryInventoryDetailSlidePage,
  })),
);

const creationSlide = lazyWithPreload(() =>
  import("./pages/UpholsteryInventoryCreationSlidePage").then((module) => ({
    default: module.UpholsteryInventoryCreationSlidePage,
  })),
);

const storedAmountSheet = lazyWithPreload(() =>
  import("./pages/StoredAmountSheetPage").then((module) => ({
    default: module.StoredAmountSheetPage,
  })),
);

const cardActionsSheet = lazyWithPreload(() =>
  import("./pages/InventoryCardActionsSheetPage").then((module) => ({
    default: module.InventoryCardActionsSheetPage,
  })),
);

const detailActionsSheet = lazyWithPreload(() =>
  import("./pages/InventoryDetailActionsSheetPage").then((module) => ({
    default: module.InventoryDetailActionsSheetPage,
  })),
);

export const preloadInventoryCreationSurface = creationSlide.preload;

export const upholsteryInventorySurfaces: SurfaceRegistrations = {
  [INVENTORY_CREATION_SLIDE_ID]: {
    surface: "slide",
    component: creationSlide.Component,
  },
  [INVENTORY_DETAIL_SLIDE_ID]: {
    surface: "slide",
    component: detailSlide.Component,
  },
  [STORED_AMOUNT_SHEET_ID]: {
    surface: "sheet",
    component: storedAmountSheet.Component,
  },
  [INVENTORY_CARD_ACTIONS_SHEET_ID]: {
    surface: "sheet",
    component: cardActionsSheet.Component,
  },
  [INVENTORY_DETAIL_ACTIONS_SHEET_ID]: {
    surface: "sheet",
    component: detailActionsSheet.Component,
  },
};
