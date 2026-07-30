import { lazyWithPreload, type SurfaceRegistrations } from '@beyo/ui';
import {
  CLOCK_KIOSK_CONFIRM_SURFACE_ID,
  CLOCK_KIOSK_RESULT_SURFACE_ID,
} from './surface-ids';

export function loadClockKioskPage() {
  return import('./pages/ClockKioskPage').then((module) => ({
    default: module.ClockKioskPage,
  }));
}

export function loadIdentityConfirmSurfacePage() {
  return import('./pages/IdentityConfirmSurfacePage').then((module) => ({
    default: module.IdentityConfirmSurfacePage,
  }));
}

export function loadResultSurfacePage() {
  return import('./pages/ResultSurfacePage').then((module) => ({
    default: module.ResultSurfacePage,
  }));
}

const identityConfirm = lazyWithPreload(loadIdentityConfirmSurfacePage);
const result = lazyWithPreload(loadResultSurfacePage);

export const clockKioskSurfaces = {
  [CLOCK_KIOSK_CONFIRM_SURFACE_ID]: {
    surface: 'rise',
    component: identityConfirm.Component,
  },
  [CLOCK_KIOSK_RESULT_SURFACE_ID]: {
    surface: 'rise',
    component: result.Component,
  },
} satisfies SurfaceRegistrations;
