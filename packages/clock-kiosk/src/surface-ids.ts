export const CLOCK_KIOSK_CONFIRM_SURFACE_ID = 'clock-kiosk-confirm';
export const CLOCK_KIOSK_RESULT_SURFACE_ID = 'clock-kiosk-result';

export type ClockKioskSurfaceOpeners = {
  openIdentityConfirm: () => void;
  openResult: () => void;
  closeKioskSurfaces: () => void;
};
