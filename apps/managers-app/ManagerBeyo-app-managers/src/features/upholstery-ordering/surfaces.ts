import { lazyWithPreload } from "@beyo/ui";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";

import type { OrderCardViewModel, ShortageCardViewModel } from "./types";

export const UPHOLSTERY_ORDERING_SLIDE_ID = "upholstery-ordering-slide";
export const UPHOLSTERY_SHORTAGE_DETAIL_SLIDE_ID =
  "upholstery-shortage-detail-slide";
export const UPHOLSTERY_ORDER_DETAIL_SLIDE_ID =
  "upholstery-order-detail-slide";
export const UPHOLSTERY_CREATE_ORDER_SLIDE_ID =
  "upholstery-create-order-slide";
export const UPHOLSTERY_RECEIVE_ORDER_SLIDE_ID =
  "upholstery-receive-order-slide";

export type ShortageDetailSurfaceProps = {
  shortage: ShortageCardViewModel;
};

export type OrderDetailSurfaceProps = {
  order: OrderCardViewModel;
};

export type CreateOrderSurfaceProps = {
  upholsteryId: string;
  upholsteryName: string;
  defaultAmountMeters: number;
  priorityItemUpholsteryIds: string[];
};

export type ReceiveOrderSurfaceProps = {
  orderId: string;
  upholsteryName: string;
  remainingReceivableMeters: number;
  defaultAmountMeters: number;
  priorityItemUpholsteryIds: string[];
};

function loadOrderingPage() {
  return import("./pages/UpholsteryOrderingSlidePage").then((module) => ({
    default: module.UpholsteryOrderingSlidePage,
  }));
}

function loadShortageDetailPage() {
  return import("./pages/DetailSlidePages").then((module) => ({
    default: module.ShortageDetailSlidePage,
  }));
}

function loadOrderDetailPage() {
  return import("./pages/DetailSlidePages").then((module) => ({
    default: module.OrderDetailSlidePage,
  }));
}

function loadCreateOrderPage() {
  return import("./pages/OrderFormSlidePages").then((module) => ({
    default: module.CreateOrderSlidePage,
  }));
}

function loadReceiveOrderPage() {
  return import("./pages/OrderFormSlidePages").then((module) => ({
    default: module.ReceiveOrderSlidePage,
  }));
}

const orderingPage = lazyWithPreload(loadOrderingPage);
const shortageDetailPage = lazyWithPreload(loadShortageDetailPage);
const orderDetailPage = lazyWithPreload(loadOrderDetailPage);
const createOrderPage = lazyWithPreload(loadCreateOrderPage);
const receiveOrderPage = lazyWithPreload(loadReceiveOrderPage);

export const upholsteryOrderingSurfaces: SurfaceRegistrations = {
  [UPHOLSTERY_ORDERING_SLIDE_ID]: {
    surface: "slide",
    component: orderingPage.Component,
  },
  [UPHOLSTERY_SHORTAGE_DETAIL_SLIDE_ID]: {
    surface: "slide",
    component: shortageDetailPage.Component,
  },
  [UPHOLSTERY_ORDER_DETAIL_SLIDE_ID]: {
    surface: "slide",
    component: orderDetailPage.Component,
  },
  [UPHOLSTERY_CREATE_ORDER_SLIDE_ID]: {
    surface: "slide",
    component: createOrderPage.Component,
  },
  [UPHOLSTERY_RECEIVE_ORDER_SLIDE_ID]: {
    surface: "slide",
    component: receiveOrderPage.Component,
  },
};
